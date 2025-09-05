import { Env, Disaster, DisasterRow } from './types'
import { json, mapSeverityToClient, buildCorsHeaders } from './utils'
import { cache } from './cache'

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
    if (url.pathname === '/api/disasters/current' && request.method === 'GET') {
      const type = url.searchParams.get('type') || undefined
      const severity = url.searchParams.get('severity') || undefined
      const country = url.searchParams.get('country') || undefined
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200)
      const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10), 0)

      try {
        if (!env.DB) throw new Error('DB not bound; using mock')
        const cacheKey = `disasters:current:${type||'all'}:${severity||'all'}:${country||'all'}:${limit}:${offset}`
        const cached = await cache.get(env, cacheKey)
        if (cached) {
          return new Response(cached, { headers: { 'content-type': 'application/json', ...cors } })
        }
        let sql = `SELECT id, disaster_type, severity, title, country, coordinates_lat, coordinates_lng, event_timestamp
                   FROM disasters WHERE is_active = 1`
        const params: any[] = []
        if (type) { sql += ` AND disaster_type = ?`; params.push(type) }
        if (severity) { sql += ` AND severity = ?`; params.push(severity.toUpperCase()) }
        if (country) { sql += ` AND country = ?`; params.push(country) }
        sql += ` ORDER BY event_timestamp DESC LIMIT ? OFFSET ?`
        params.push(limit, offset)

        const stmt = env.DB.prepare(sql)
        const rows = await stmt.bind(...params).all<DisasterRow>()
        const items: Disaster[] = rows.results.map(r => ({
          id: String(r.id),
          type: r.disaster_type,
          severity: mapSeverityToClient(r.severity),
          country: r.country || undefined,
          latitude: r.coordinates_lat ?? undefined,
          longitude: r.coordinates_lng ?? undefined,
          title: r.title,
          occurred_at: r.event_timestamp,
        }))
    const body: APIResponse<Disaster[]> = { success: true, data: items, meta: { limit, offset } }
        const jsonStr = JSON.stringify(body)
        await cache.put(env, cacheKey, jsonStr, 300)
  return new Response(jsonStr, { headers: { 'content-type': 'application/json', ...cors } })
      } catch (err) {
        // Fallback to mock data for now
        let items = mockDisasters
        if (type) items = items.filter(d => d.type === type)
        if (severity) items = items.filter(d => d.severity === severity)
        if (country) items = items.filter(d => d.country === country)
    const body: APIResponse<Disaster[]> = { success: true, data: items, meta: { limit, offset, fallback: true } }
  return json(body, { headers: { ...cors } })
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
    const body: APIResponse<{ totals: { type: string; count: number }[] }> = { success: true, data: { totals } }
        const jsonStr = JSON.stringify(body)
        await cache.put(env, cacheKey, jsonStr, 300)
  return new Response(jsonStr, { headers: { 'content-type': 'application/json', ...cors } })
      } catch (err) {
        const counts: Record<string, number> = {}
        for (const d of mockDisasters) counts[d.type] = (counts[d.type] || 0) + 1
        const totals = Object.entries(counts).map(([type, count]) => ({ type, count }))
    const body: APIResponse<{ totals: { type: string; count: number }[] }> = { success: true, data: { totals }, meta: { fallback: true } }
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
        const sql = `SELECT id, disaster_type, severity, title, country, coordinates_lat, coordinates_lng, event_timestamp
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
