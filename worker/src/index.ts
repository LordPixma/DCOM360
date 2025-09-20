import { Env, Disaster, DisasterRow } from './types'
import { json, mapSeverityToClient, buildCorsHeaders, sanitizeText } from './utils'
import { cache } from './cache'
import { XMLParser } from 'fast-xml-parser'
// Helper: parse World Earthquake Report HTML for totals and top items
function parseEqReportHtml(html: string): { totals?: { total?: number; m5?: number; m4?: number; m3?: number; m2?: number }, top?: Array<{ rank: number; mag: number; title: string; url?: string }> } {
  const res: any = {}
  try {
    const safe = String(html || '')
    const sumMatch = safe.match(/Summary:\s*([^<]+)/i)
    if (sumMatch) {
      const s = sumMatch[1]
      const m5 = s.match(/(\d+)\s+quakes?\s+5(?:\.[0-9])?\+/i)
      const m4 = s.match(/(\d+)\s+quakes?\s+4(?:\.[0-9])?\+/i)
      const m3 = s.match(/(\d+)\s+quakes?\s+3(?:\.[0-9])?\+/i)
      const m2 = s.match(/(\d+)\s+quakes?\s+2(?:\.[0-9])?\+/i)
      const total = s.match(/\((\d+)\s+total\)/i)
      res.totals = {
        total: total ? Number(total[1]) : undefined,
        m5: m5 ? Number(m5[1]) : undefined,
        m4: m4 ? Number(m4[1]) : undefined,
        m3: m3 ? Number(m3[1]) : undefined,
        m2: m2 ? Number(m2[1]) : undefined,
      }
    }
    const top: Array<{ rank: number; mag: number; title: string; url?: string }> = []
    const re1 = /#(\d+):\s*Mag\s*(\d+(?:\.\d+)?)\s*<a[^>]+href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/gi
    let m: RegExpExecArray | null
    while ((m = re1.exec(safe)) && top.length < 10) {
      top.push({ rank: Number(m[1]), mag: Number(m[2]), url: m[3], title: m[4] })
    }
    if (top.length) res.top = top.sort((a, b) => a.rank - b.rank)
  } catch {}
  return res
}

async function enrichEqItem(env: Env, url: string): Promise<{ felt?: number; local_time_line?: string; page_title?: string; location_line?: string; region?: string; country?: string; lat?: number; lon?: number } | null> {
  const key = `eq:detail:${url}`
  const cached = await cache.get(env, key)
  if (cached) {
    try { return JSON.parse(cached) } catch { /* ignore */ }
  }
  try {
    const resp = await fetch(url, { cf: { cacheTtl: 1800, cacheEverything: true } })
    if (!resp.ok) throw new Error(`fetch ${resp.status}`)
    const html = await resp.text()
    const out: { felt?: number; local_time_line?: string; page_title?: string; location_line?: string; region?: string; country?: string; lat?: number; lon?: number } = {}
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    if (titleMatch) out.page_title = titleMatch[1].trim()
    const feltMatch = html.match(/(\d+)\s+felt\s+reports?/i)
    if (feltMatch) out.felt = Number(feltMatch[1])
    const localMatch = html.match(/(?:Local\s*time|Time)\s*:?\s*([^<\n]+?(?:GMT|UTC)[^<\n]*)/i)
    if (localMatch) out.local_time_line = localMatch[1].trim()
    // Location/Region line heuristics
    const locLabel = html.match(/(?:Location|Place|Epicenter)\s*:?\s*([^<\n]+)/i)
    if (locLabel) out.location_line = locLabel[1].trim()
    // Region/Country extraction from title or location line
    const regionMatch = (out.location_line || out.page_title || '').match(/([A-Z][A-Za-z\-\s]+)(?:,\s*([A-Z][A-Za-z\-\s]+))?$/)
    if (regionMatch) {
      out.region = (regionMatch[2] ? regionMatch[1] : regionMatch[1])?.trim()
      out.country = (regionMatch[2] ? regionMatch[2] : undefined)?.trim()
    }
    // Lat/Lon if present
    const latMatch = html.match(/(?:Lat(?:itude)?)[^\d\-]*([\-\d\.]+)/i)
    const lonMatch = html.match(/(?:Lon(?:gitude)?)[^\d\-]*([\-\d\.]+)/i)
    if (latMatch) { const v = Number(latMatch[1]); if (isFinite(v)) out.lat = v }
    if (lonMatch) { const v = Number(lonMatch[1]); if (isFinite(v)) out.lon = v }
    await cache.put(env, key, JSON.stringify(out), 43200) // 12h
    return out
  } catch {
    return null
  }
}

export interface APIResponse<T> {
  success: boolean
  data: T
  error?: { code: string; message: string }
  meta?: Record<string, unknown>
}

const mockDisasters: Disaster[] = [
  { id: '1', type: 'flood', severity: 'yellow', country: 'NG', latitude: 9.08, longitude: 8.68, title: 'Flood in Plateau', occurred_at: new Date().toISOString() },
  { id: '2', type: 'earthquake', severity: 'red', country: 'TR', latitude: 39.92, longitude: 32.85, title: 'Earthquake near Ankara', occurred_at: new Date().toISOString() },
  { id: '3', type: 'wildfire', severity: 'green', country: 'US', latitude: 34.05, longitude: -118.24, title: 'Small wildfire in LA', occurred_at: new Date().toISOString() },
]

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
  const cors = buildCorsHeaders(env, request)
    const url = new URL(request.url)
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          ...cors,
          'access-control-allow-methods': 'GET,POST,OPTIONS',
          'access-control-allow-headers': 'content-type,authorization,x-admin-email'
        }
      })
    }
    // Simple KV-backed rate limit (best-effort)
    const rlKey = `rl:${url.pathname}:${request.headers.get('cf-connecting-ip') || 'anon'}`
    try {
      const nowBucket = Math.floor(Date.now() / 1000 / 60) // 1-min bucket
      const key = `${rlKey}:${nowBucket}`
      const current = parseInt((await cache.get(env, key)) || '0', 10)
      if (current >= 120) {
        return json({ success: false, data: null, error: { code: 'rate_limited', message: 'Too many requests' } }, { status: 429, headers: { ...cors } })
      }
      await cache.put(env, key, String(current + 1), 60)
    } catch {}
    if (url.pathname === '/api/health') {
      return json(
        { success: true, data: { status: 'ok', ts: new Date().toISOString() } },
        { headers: { ...cors } }
      )
    }
    // Admin auth helper
    const isAdminRequest = url.pathname.startsWith('/api/admin/')
    const requireAdmin = () => {
      const hdr = request.headers.get('authorization') || ''
      const token = hdr.replace(/^Bearer\s+/i, '')
      if (!env.ADMIN_TOKEN || token !== env.ADMIN_TOKEN) {
        return json({ success: false, data: null, error: { code: 'unauthorized', message: 'Invalid admin token' } }, { status: 401, headers: { ...cors } })
      }
      return null
    }
    if (isAdminRequest) {
      const unauth = requireAdmin()
      if (unauth) return unauth
      // role helper: derive role from X-Admin-Email header if present
      async function getAdminRole(): Promise<string | null> {
        const email = (request.headers.get('x-admin-email') || '').toLowerCase().trim()
        if (!email) return null
        try {
          const row = await env.DB.prepare('SELECT role FROM admin_users WHERE email = ?').bind(email).first<{ role: string }>()
          return row?.role || null
        } catch { return null }
      }
      // Router for admin endpoints
      if (url.pathname === '/api/admin/health') {
        return json({ success: true, data: { status: 'ok', ts: new Date().toISOString() } }, { headers: { ...cors } })
      }
      if (url.pathname === '/api/admin/cache/purge' && request.method === 'POST') {
        const keys = [
          'disasters:summary',
          'disasters:current:all:all:all:50:0',
          'disasters:history:7',
          'countries:list'
        ]
        await Promise.all(keys.map(k => cache.del(env, k)))
        return json({ success: true, data: { purged: keys.length } }, { headers: { ...cors } })
      }
      if (url.pathname === '/api/admin/reports/overview' && request.method === 'GET') {
        try {
          const totals = await env.DB.prepare("SELECT disaster_type as type, COUNT(*) as count FROM disasters GROUP BY disaster_type").all<{ type: string; count: number }>()
          const severities = await env.DB.prepare("SELECT severity, COUNT(*) as count FROM disasters GROUP BY severity").all<{ severity: string; count: number }>()
          const recent = await env.DB.prepare("SELECT id, title, event_timestamp FROM disasters ORDER BY event_timestamp DESC LIMIT 25").all<{ id: number; title: string; event_timestamp: string }>()
          return json({ success: true, data: { totals: totals.results, severities: severities.results, recent: recent.results } }, { headers: { ...cors } })
        } catch (e: any) {
          return json({ success: false, data: null, error: { code: 'report_error', message: e?.message || String(e) } }, { status: 500, headers: { ...cors } })
        }
      }
      if (url.pathname === '/api/admin/reports/logs' && request.method === 'GET') {
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '100', 10), 1000)
        try {
          const rows = await env.DB.prepare('SELECT id, email_date, processing_timestamp, disasters_processed, new_disasters, updated_disasters, status, processing_time_ms, email_size_bytes FROM processing_logs ORDER BY processing_timestamp DESC LIMIT ?').bind(limit).all()
          return json({ success: true, data: rows.results }, { headers: { ...cors } })
        } catch (e: any) {
          return json({ success: false, data: null, error: { code: 'report_error', message: e?.message || String(e) } }, { status: 500, headers: { ...cors } })
        }
      }
      if (url.pathname === '/api/admin/reports/countries' && request.method === 'GET') {
        try {
          const rows = await env.DB.prepare('SELECT country, COUNT(*) as count FROM disasters WHERE country IS NOT NULL AND country <> "" GROUP BY country ORDER BY count DESC').all<{ country: string; count: number }>()
          return json({ success: true, data: rows.results }, { headers: { ...cors } })
        } catch (e: any) {
          return json({ success: false, data: null, error: { code: 'report_error', message: e?.message || String(e) } }, { status: 500, headers: { ...cors } })
        }
      }
      if (url.pathname === '/api/admin/reports/timeseries' && request.method === 'GET') {
        const days = Math.min(Math.max(parseInt(url.searchParams.get('days') || '30', 10), 1), 365)
        try {
          const rows = await env.DB.prepare("SELECT DATE(event_timestamp) as day, COUNT(*) as count FROM disasters WHERE event_timestamp >= datetime('now', ?) GROUP BY DATE(event_timestamp) ORDER BY day ASC").bind(`-${days} days`).all<{ day: string; count: number }>()
          return json({ success: true, data: rows.results }, { headers: { ...cors } })
        } catch (e: any) {
          return json({ success: false, data: null, error: { code: 'report_error', message: e?.message || String(e) } }, { status: 500, headers: { ...cors } })
        }
      }
      if (url.pathname === '/api/admin/disasters/purge' && request.method === 'POST') {
        // Danger: full purge; support safe modes via query params
        const mode = url.searchParams.get('mode') || 'demo'
        try {
          if (mode === 'demo') {
            // Remove known demo titles and CI Smoke entries
            await env.DB.batch([
              env.DB.prepare("DELETE FROM disaster_history WHERE disaster_id IN (SELECT id FROM disasters WHERE title LIKE 'CI Smoke%')"),
              env.DB.prepare("DELETE FROM disasters WHERE title LIKE 'CI Smoke%'")
            ])
          } else if (mode === 'all') {
            // Full wipe requires superadmin role and explicit confirmation
            const role = await getAdminRole()
            const confirm = (url.searchParams.get('confirm') || '').toUpperCase()
            if (role !== 'superadmin' || confirm !== 'PURGE-ALL') {
              return json({ success: false, data: null, error: { code: 'forbidden', message: 'superadmin and confirm=PURGE-ALL required' } }, { status: 403, headers: { ...cors } })
            }
            await env.DB.batch([
              env.DB.prepare('DELETE FROM disaster_history'),
              env.DB.prepare('DELETE FROM disasters')
            ])
          }
          // Purge caches
          const keys = ['disasters:summary','disasters:current:all:all:all:50:0','disasters:history:7','countries:list']
          await Promise.all(keys.map(k => cache.del(env, k)))
          return json({ success: true, data: { mode } }, { headers: { ...cors } })
        } catch (e: any) {
          return json({ success: false, data: null, error: { code: 'purge_error', message: e?.message || String(e) } }, { status: 500, headers: { ...cors } })
        }
      }
      if (url.pathname === '/api/admin/users' && request.method === 'POST') {
        try {
          const body = await request.json().catch(() => ({})) as any
          const email = String(body.email || '').toLowerCase().trim()
          const role = (String(body.role || 'admin')).toLowerCase()
          if (!email) return json({ success: false, data: null, error: { code: 'bad_request', message: 'email required' } }, { status: 400, headers: { ...cors } })
          await env.DB.prepare('INSERT OR IGNORE INTO admin_users (email, role) VALUES (?, ?)').bind(email, role).run()
          return json({ success: true, data: { email, role } }, { headers: { ...cors } })
        } catch (e: any) {
          return json({ success: false, data: null, error: { code: 'user_error', message: e?.message || String(e) } }, { status: 500, headers: { ...cors } })
        }
      }
      if (url.pathname === '/api/admin/users' && request.method === 'GET') {
        const rows = await env.DB.prepare('SELECT id, email, role, created_at FROM admin_users ORDER BY created_at DESC').all<{ id: number; email: string; role: string; created_at: string }>()
        return json({ success: true, data: rows.results }, { headers: { ...cors } })
      }
      if (url.pathname === '/api/admin/users' && request.method === 'DELETE') {
        const email = (url.searchParams.get('email') || '').toLowerCase().trim()
        if (!email) return json({ success: false, data: null, error: { code: 'bad_request', message: 'email required' } }, { status: 400, headers: { ...cors } })
        await env.DB.prepare('DELETE FROM admin_users WHERE email = ?').bind(email).run()
        return json({ success: true, data: { email } }, { headers: { ...cors } })
      }
      // Unknown admin route
      return json({ success: false, data: null, error: { code: 'not_found', message: 'Unknown admin route' } }, { status: 404, headers: { ...cors } })
    }
    if (url.pathname === '/metrics' && request.method === 'GET') {
      const body = `# HELP app_info Basic info\n# TYPE app_info gauge\napp_info{env="${env.ENV_ORIGIN || 'unknown'}"} 1`
      return new Response(body, { headers: { 'content-type': 'text/plain; version=0.0.4' } })
    }
    // Public config for frontend: return map style URL if key is configured server-side via Pages/Worker var
    if (url.pathname === '/api/config' && request.method === 'GET') {
      const key = (env as any).VITE_MAPTILER_KEY || (env as any).MAPTILER_KEY || ''
      const style = key ? `https://api.maptiler.com/maps/streets-v2/style.json?key=${key}` : ''
      const body: APIResponse<{ map_style: string; has_key: boolean }> = {
        success: true,
        data: { map_style: style, has_key: Boolean(key) }
      }
      return json(body, { headers: { ...cors, 'cache-control': 'public, max-age=300' } })
    }
    // Aggregated news from external RSS feeds (cached)
    if (url.pathname === '/api/news' && request.method === 'GET') {
  const CACHE_KEY = 'news:critical:msf+crisisgroup:v2'
      const cached = await cache.get(env, CACHE_KEY)
      if (cached) return new Response(cached, { headers: { 'content-type': 'application/json', ...cors } })
      try {
        const urls = [
          'https://www.msf.org/rss/all',
          'https://www.crisisgroup.org/rss'
        ]
        const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' })
        const responses = await Promise.all(urls.map(u => fetch(u, { cf: { cacheTtl: 600, cacheEverything: true } }).then(r => r.text())))
        const items: Array<{ id: string; title: string; link: string; ts: string; source: string }> = []
        const toISO = (v: any): string => {
          try {
            const t = Date.parse(String(v))
            if (!isNaN(t)) return new Date(t).toISOString()
          } catch {}
          return new Date().toISOString()
        }
        for (let i = 0; i < responses.length; i++) {
          const xml = responses[i]
          const obj = parser.parse(xml)
          // Try both RSS 2.0 and Atom
          const rss = obj?.rss?.channel
          const atom = obj?.feed
          if (rss?.item) {
            const arr = Array.isArray(rss.item) ? rss.item : [rss.item]
            for (const it of arr.slice(0, 20)) {
              items.push({
                id: it.guid?.['#text'] || it.guid || it.link || `${urls[i]}#${it.title}`,
                title: it.title || 'Untitled',
                link: it.link || urls[i],
                ts: it.pubDate ? toISO(it.pubDate) : toISO(Date.now()),
                source: urls[i]
              })
            }
          } else if (atom?.entry) {
            const arr = Array.isArray(atom.entry) ? atom.entry : [atom.entry]
            for (const it of arr.slice(0, 20)) {
              const link = Array.isArray(it.link) ? it.link[0]?.href : it.link?.href || it.link
              items.push({
                id: it.id || link || `${urls[i]}#${it.title}`,
                title: it.title || 'Untitled',
                link: link || urls[i],
                ts: it.updated ? toISO(it.updated) : (it.published ? toISO(it.published) : toISO(Date.now())),
                source: urls[i]
              })
            }
          }
        }
  // Sort by timestamp desc and take top 5
  items.sort((a, b) => (new Date(b.ts).getTime() - new Date(a.ts).getTime()))
  const top = items.slice(0, 5)
        const body: APIResponse<typeof top> = { success: true, data: top }
        const jsonStr = JSON.stringify(body)
        await cache.put(env, CACHE_KEY, jsonStr, 600)
        return new Response(jsonStr, { headers: { 'content-type': 'application/json', ...cors } })
      } catch (e: any) {
        return json({ success: false, data: [], error: { code: 'news_error', message: e?.message || String(e) } }, { status: 500, headers: { ...cors } })
      }
    }
    // Enriched Earthquake Report for a given disaster id
    if (url.pathname.startsWith('/api/disasters/') && url.pathname.endsWith('/eq-report') && request.method === 'GET') {
      const id = url.pathname.split('/').slice(-2, -1)[0]
      try {
        if (!env.DB) throw new Error('DB not bound')
        const row = await env.DB.prepare('SELECT id, title FROM disasters WHERE id = ? OR external_id = ? LIMIT 1').bind(id, id).first<{ id: number; title: string }>()
        if (!row) return json({ success: false, data: null, error: { code: 'not_found', message: 'Disaster not found' } }, { status: 404, headers: { ...cors } })
        const parsed = parseEqReportHtml(row.title)
        const top = parsed.top || []
        const enriched = await Promise.all(top.map(async it => {
          if (!it.url) return it
          const extra = await enrichEqItem(env, it.url)
          return { ...it, felt: extra?.felt, local_time: extra?.local_time_line, page_title: extra?.page_title, location: extra?.location_line, region: extra?.region, country: extra?.country, lat: extra?.lat, lon: extra?.lon }
        }))
        return json({ success: true, data: { totals: parsed.totals, top: enriched } }, { headers: { ...cors, 'cache-control': 'public, max-age=600' } })
      } catch (e: any) {
        return json({ success: false, data: null, error: { code: 'server_error', message: e?.message || String(e) } }, { status: 500, headers: { ...cors } })
      }
    }
  if (url.pathname === '/api/disasters/current' && request.method === 'GET') {
      const type = url.searchParams.get('type') || undefined
      const severity = url.searchParams.get('severity') || undefined
      const country = url.searchParams.get('country') || undefined
      const q = url.searchParams.get('q') || undefined
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200)
      const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10), 0)

      try {
        if (!env.DB) throw new Error('DB not bound; using mock')
  const cacheKey = `disasters:current:${type||'all'}:${severity||'all'}:${country||'all'}:${q||'none'}:${limit}:${offset}`
        const cached = await cache.get(env, cacheKey)
        if (cached) {
          return new Response(cached, { headers: { 'content-type': 'application/json', ...cors } })
        }
        // Build filter SQL and params once to share between count and page queries
        let baseWhere = `FROM disasters WHERE is_active = 1`
        const params: any[] = []
        if (type) { baseWhere += ` AND disaster_type = ?`; params.push(type) }
        if (severity) { baseWhere += ` AND severity = ?`; params.push(severity.toUpperCase()) }
        if (country) { baseWhere += ` AND country = ?`; params.push(country) }
        if (q) { baseWhere += ` AND (title LIKE ? OR country LIKE ?)`; const pat = `%${q}%`; params.push(pat, pat) }

        // Total count for the current filters
        const countSql = `SELECT COUNT(*) as total ${baseWhere}`
        const countRow = await env.DB.prepare(countSql).bind(...params).first<{ total: number }>()
        const total = countRow?.total ?? 0

        // Paged query
        const pageSql = `SELECT id, external_id, disaster_type, severity, title, country, coordinates_lat, coordinates_lng, event_timestamp ${baseWhere} ORDER BY event_timestamp DESC LIMIT ? OFFSET ?`
        const pageParams = [...params, limit, offset]
        const rows = await env.DB.prepare(pageSql).bind(...pageParams).all<DisasterRow>()
        const items: Disaster[] = rows.results.map(r => ({
          id: String(r.id),
          type: r.disaster_type,
          severity: mapSeverityToClient(r.severity),
          country: r.country || undefined,
          latitude: r.coordinates_lat ?? undefined,
          longitude: r.coordinates_lng ?? undefined,
          title: sanitizeText(r.title) || r.title,
          occurred_at: r.event_timestamp,
          source: r.external_id?.startsWith('gdacs:') ? 'gdacs' : r.external_id?.startsWith('reliefweb:') ? 'reliefweb' : undefined,
        }))
  const body: APIResponse<Disaster[]> = { success: true, data: items, meta: { limit, offset, total } }
        const jsonStr = JSON.stringify(body)
        await cache.put(env, cacheKey, jsonStr, 300)
  return new Response(jsonStr, { headers: { 'content-type': 'application/json', ...cors } })
      } catch (err) {
        // Fallback to mock data for now
        let items = mockDisasters
        if (type) items = items.filter(d => d.type === type)
        if (severity) items = items.filter(d => d.severity === severity)
        if (country) items = items.filter(d => d.country === country)
    const body: APIResponse<Disaster[]> = { success: true, data: items, meta: { limit, offset, total: items.length, fallback: true } }
  return json(body, { headers: { ...cors } })
      }
    }
    // Single disaster details
    if (url.pathname.startsWith('/api/disasters/') && request.method === 'GET') {
      const id = url.pathname.split('/').pop()!
      try {
        if (!env.DB) {
          // fallback mock
          const item = mockDisasters.find(d => d.id === id)
          if (!item) return json({ success: false, data: null, error: { code: 'not_found', message: 'Disaster not found'} }, { status: 404, headers: { ...cors } })
          return json({ success: true, data: item }, { headers: { ...cors } })
        }
        const sql = `SELECT id, external_id, disaster_type, severity, title, country, coordinates_lat, coordinates_lng, event_timestamp, description, magnitude, wind_speed, depth_km, affected_population, affected_radius_km, metadata FROM disasters WHERE id = ? OR external_id = ? LIMIT 1`
        const row = await env.DB.prepare(sql).bind(id, id).first<any>()
        if (!row) return json({ success: false, data: null, error: { code: 'not_found', message: 'Disaster not found' } }, { status: 404, headers: { ...cors } })
        const item: Disaster & Record<string, unknown> = {
          id: String(row.id),
          type: row.disaster_type,
          severity: mapSeverityToClient(row.severity),
          country: row.country || undefined,
          latitude: row.coordinates_lat ?? undefined,
          longitude: row.coordinates_lng ?? undefined,
          title: sanitizeText(row.title) || row.title,
          occurred_at: row.event_timestamp,
          source: row.external_id?.startsWith('gdacs:') ? 'gdacs' : row.external_id?.startsWith('reliefweb:') ? 'reliefweb' : undefined,
          description: sanitizeText(row.description) || row.description || undefined,
          magnitude: row.magnitude ?? undefined,
          wind_speed: row.wind_speed ?? undefined,
          depth_km: row.depth_km ?? undefined,
          affected_population: row.affected_population ?? undefined,
          affected_radius_km: row.affected_radius_km ?? undefined,
          metadata: (() => { try { return row.metadata ? JSON.parse(row.metadata) : undefined } catch { return undefined } })()
        }
        return json({ success: true, data: item }, { headers: { ...cors } })
      } catch (e: any) {
        return json({ success: false, data: null, error: { code: 'server_error', message: e?.message || String(e) } }, { status: 500, headers: { ...cors } })
      }
    }
  if (url.pathname === '/api/disasters/summary' && request.method === 'GET') {
      try {
        if (!env.DB) throw new Error('DB not bound; using mock')
        const cacheKey = 'disasters:summary'
        const cached = await cache.get(env, cacheKey)
        if (cached) {
          return new Response(cached, { headers: { 'content-type': 'application/json', ...cors } })
        }
    const typeSql = `SELECT disaster_type as type, COUNT(*) as count FROM disasters WHERE is_active = 1 GROUP BY disaster_type`
    const rows = await env.DB.prepare(typeSql).all<{ type: string; count: number }>()
    const totals = rows.results
    const sevRows = await env.DB.prepare(`SELECT severity, COUNT(*) as count FROM disasters WHERE is_active = 1 GROUP BY severity`).all<{ severity: string; count: number }>()
    const affectedRow = await env.DB.prepare(`SELECT COALESCE(SUM(affected_population), 0) as total_affected FROM disasters WHERE is_active = 1`).first<{ total_affected: number }>()
    const recent24 = await env.DB.prepare(`SELECT COUNT(*) as cnt FROM disasters WHERE is_active = 1 AND event_timestamp >= datetime('now', '-1 day')`).first<{ cnt: number }>()
    const totalAffected = affectedRow?.total_affected ?? 0
    const economicEstimate = Math.round(totalAffected * 150) // simple placeholder estimate in USD
  const body: APIResponse<{ totals: { type: string; count: number }[]; severity_breakdown: { severity: string; count: number }[]; total_affected_population: number; recent_24h: number; economic_impact_estimate_usd: number }> = { success: true, data: { totals, severity_breakdown: sevRows.results, total_affected_population: totalAffected, recent_24h: recent24?.cnt ?? 0, economic_impact_estimate_usd: economicEstimate } }
        const jsonStr = JSON.stringify(body)
        await cache.put(env, cacheKey, jsonStr, 300)
  return new Response(jsonStr, { headers: { 'content-type': 'application/json', ...cors } })
      } catch (err) {
        const counts: Record<string, number> = {}
        for (const d of mockDisasters) counts[d.type] = (counts[d.type] || 0) + 1
        const totals = Object.entries(counts).map(([type, count]) => ({ type, count }))
  const body: APIResponse<{ totals: { type: string; count: number }[]; severity_breakdown?: any; total_affected_population?: number; recent_24h?: number; economic_impact_estimate_usd?: number }> = { success: true, data: { totals }, meta: { fallback: true } }
  return json(body, { headers: { ...cors } })
      }
    }
    if (url.pathname === '/api/disasters/history' && request.method === 'GET') {
      const days = Math.min(Math.max(parseInt(url.searchParams.get('days') || '7', 10), 1), 90)
      try {
        if (!env.DB) throw new Error('DB not bound; using mock')
        const cacheKey = `disasters:history:${days}`
        const cached = await cache.get(env, cacheKey)
        if (cached) {
          return new Response(cached, { headers: { 'content-type': 'application/json', ...cors } })
        }
  const sql = `SELECT id, external_id, disaster_type, severity, title, country, coordinates_lat, coordinates_lng, event_timestamp
                     FROM disasters
                     WHERE event_timestamp >= datetime('now', ?)
                     ORDER BY event_timestamp DESC`
        const rows = await env.DB.prepare(sql).bind(`-${days} days`).all<DisasterRow>()
        const items: Disaster[] = rows.results.map(r => ({
          id: String(r.id),
          type: r.disaster_type,
          severity: mapSeverityToClient(r.severity),
          country: r.country || undefined,
          latitude: r.coordinates_lat ?? undefined,
          longitude: r.coordinates_lng ?? undefined,
          title: r.title,
          occurred_at: r.event_timestamp,
          source: r.external_id?.startsWith('gdacs:') ? 'gdacs' : r.external_id?.startsWith('reliefweb:') ? 'reliefweb' : undefined,
        }))
    const body: APIResponse<Disaster[]> = { success: true, data: items, meta: { days } }
        const jsonStr = JSON.stringify(body)
        await cache.put(env, cacheKey, jsonStr, 300)
  return new Response(jsonStr, { headers: { 'content-type': 'application/json', ...cors } })
      } catch (err) {
        // Fallback: use mock and pretend all within period
    const body: APIResponse<Disaster[]> = { success: true, data: mockDisasters, meta: { days, fallback: true } }
  return json(body, { headers: { ...cors } })
      }
    }
    if (url.pathname === '/api/countries' && request.method === 'GET') {
      try {
        if (!env.DB) throw new Error('DB not bound; using mock')
        const cacheKey = 'countries:list'
        const cached = await cache.get(env, cacheKey)
        if (cached) {
          return new Response(cached, { headers: { 'content-type': 'application/json', ...cors } })
        }
        const sql = `SELECT code, name FROM countries ORDER BY name`
        const rows = await env.DB.prepare(sql).all<{ code: string; name: string }>()
    const body: APIResponse<{ code: string; name: string }[]> = { success: true, data: rows.results }
        const jsonStr = JSON.stringify(body)
        await cache.put(env, cacheKey, jsonStr, 3600)
  return new Response(jsonStr, { headers: { 'content-type': 'application/json', ...cors } })
      } catch (err) {
        // Minimal fallback list
    const data = [
          { code: 'US', name: 'United States' },
          { code: 'NG', name: 'Nigeria' }
        ]
  return json({ success: true, data, meta: { fallback: true } }, { headers: { ...cors } })
      }
    }
    return new Response('Not found', { status: 404 })
  }
}
