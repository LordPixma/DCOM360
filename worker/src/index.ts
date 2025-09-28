import { Env, Disaster, DisasterRow } from './types'
import { json, mapSeverityToClient, buildCorsHeaders, sanitizeText } from './utils'
import { cache } from './cache'
import { XMLParser } from 'fast-xml-parser'
// Helper: parse World Earthquake Report HTML for totals and top items
function parseEqReportHtml(html: string): { totals?: { total?: number; m5?: number; m4?: number; m3?: number; m2?: number }, top?: Array<{ rank: number; mag: number; title: string; url?: string; datetime?: string; location?: string; felt?: number }> } {
  const res: any = {}
  try {
    const safe = String(html || '')
    
    // Enhanced summary parsing - handles both HTML and plain text formats
    const sumMatch = safe.match(/Summary:\s*([^<\n]+)/i)
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
    
    const top: Array<{ rank: number; mag: number; title: string; url?: string; datetime?: string; location?: string; felt?: number }> = []
    
    // Pattern 1: HTML anchors (existing format)
    const re1 = /#(\d+):\s*Mag\s*(\d+(?:\.\d+)?)\s*<a[^>]+href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/gi
    let m: RegExpExecArray | null
    while ((m = re1.exec(safe)) && top.length < 10) {
      top.push({ rank: Number(m[1]), mag: Number(m[2]), url: m[3], title: m[4] })
    }
    
    // Pattern 2: Raw text format from attachment - handles multi-line entries
    if (top.length === 0) {
      // Match pattern: "#1: Mag 5.2 Location, details Wednesday, Sep 24, 2025, at 12:39 pm (GMT -5) - #2: Mag 5.1..."
      const rawPattern = /#(\d+):\s*Mag\s*(\d+(?:\.\d+)?)\s*([^#]+?)(?=\s*#\d+:|$)/gi
      let m2: RegExpExecArray | null
      while ((m2 = rawPattern.exec(safe)) && top.length < 20) {
        const rank = Number(m2[1])
        const mag = Number(m2[2])
        const fullText = m2[3].trim()
        
        // Extract location (everything before the date pattern)
        const dateMatch = fullText.match(/(.+?)\s+(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s*([^-]+)/i)
        const location = dateMatch ? dateMatch[1].trim().replace(/,\s*$/, '') : fullText.split(',')[0]
        const datetime = dateMatch ? dateMatch[2].trim() : ''
        
        // Extract felt reports if present
        const feltMatch = fullText.match(/(\d+)\s*(?:felt\s*)?reports?/i)
        const felt = feltMatch ? Number(feltMatch[1]) : undefined
        
        top.push({ 
          rank, 
          mag, 
          title: location,
          location: location,
          datetime: datetime,
          felt: felt
        })
      }
    }
    
    // Pattern 3: Fallback for simple formats
    if (top.length === 0) {
      const re3 = /#(\d+):\s*Mag\s*(\d+(?:\.\d+)?)\s*(?:[-–]\s*)?([^#\n]+?)(?:\s*[-–]\s*(\d+)\s*(?:felt\s*)?reports?)?(?=\s*#|$)/gi
      let m3: RegExpExecArray | null
      while ((m3 = re3.exec(safe)) && top.length < 10) {
        const rank = Number(m3[1])
        const mag = Number(m3[2])
        const title = m3[3].trim()
        const felt = m3[4] ? Number(m3[4]) : undefined
        top.push({ rank, mag, title, felt })
      }
    }
    
    if (top.length) res.top = top.sort((a, b) => a.rank - b.rank)
  } catch {}
  return res
}

// Safely parse a JSON string into an array
function safeJsonArray(v: string): any[] | undefined {
  try {
    const parsed = JSON.parse(v)
    return Array.isArray(parsed) ? parsed : undefined
  } catch { return undefined }
}

// Compute simple trend classification based on growth rate
function computeTrend(growth: number | null | undefined): 'rising' | 'falling' | 'stable' | undefined {
  if (growth == null || isNaN(growth)) return undefined
  if (growth > 0.15) return 'rising'
  if (growth < -0.1) return 'falling'
  return 'stable'
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
    // Optimized rate limiting with tiered limits
    const isAdminPath = url.pathname.startsWith('/api/admin/')
    if (!isAdminPath) { // Skip rate limiting for admin endpoints (they have auth)
      const ip = request.headers.get('cf-connecting-ip') || 'anon'
      const nowBucket = Math.floor(Date.now() / 1000 / 60) // 1-min bucket
      const rlKey = `rl:${ip}:${nowBucket}`
      try {
        const current = parseInt((await cache.get(env, rlKey)) || '0', 10)
        const limit = url.pathname.includes('/summary') ? 20 : 120 // Lower limit for expensive queries
        if (current >= limit) {
          return json({ success: false, data: null, error: { code: 'rate_limited', message: 'Too many requests' } }, { status: 429, headers: { ...cors, 'retry-after': '60' } })
        }
        cache.put(env, rlKey, String(current + 1), 60).catch(() => {}) // Fire and forget
      } catch {}
    }
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
          'countries:list',
          // Newly added Phase 1 domain caches
          'cyclones:latest',
          'wildfire:clusters:50',
          'feeds:health'
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
      // Phase 1 demo seed endpoint: inserts representative cyclone and wildfire cluster rows
      if (url.pathname === '/api/admin/seed/phase1' && request.method === 'POST') {
        try {
          const nowIso = new Date().toISOString()
          // Sample cyclone advisories (two advisories for one named storm, one for another)
          const cycloneInserts = [
            env.DB.prepare(`INSERT OR IGNORE INTO cyclones (external_id, name, basin, category, latitude, longitude, max_wind_kt, min_pressure_mb, movement_dir, movement_speed_kt, advisory_time, forecast_json)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
              .bind('AL01-2025-20250928-1200', 'ALPHA', 'AL', 'Tropical Storm', 14.2, -45.1, 55, 1002, 'NW', 12, new Date(Date.now() - 2*60*60*1000).toISOString(), JSON.stringify([
                { t: 12, lat: 15.0, lng: -46.0, wind_kt: 60 },
                { t: 24, lat: 16.1, lng: -47.2, wind_kt: 65 },
                { t: 36, lat: 17.4, lng: -48.9, wind_kt: 70 }
              ])),
            env.DB.prepare(`INSERT OR IGNORE INTO cyclones (external_id, name, basin, category, latitude, longitude, max_wind_kt, min_pressure_mb, movement_dir, movement_speed_kt, advisory_time, forecast_json)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
              .bind('AL01-2025-20250928-1800', 'ALPHA', 'AL', 'Tropical Storm', 14.6, -45.6, 60, 998, 'NW', 13, new Date(Date.now() - 1*60*60*1000).toISOString(), JSON.stringify([
                { t: 12, lat: 15.4, lng: -46.5, wind_kt: 65 },
                { t: 24, lat: 16.6, lng: -47.8, wind_kt: 70 },
                { t: 36, lat: 17.9, lng: -49.5, wind_kt: 75 }
              ])),
            env.DB.prepare(`INSERT OR IGNORE INTO cyclones (external_id, name, basin, category, latitude, longitude, max_wind_kt, min_pressure_mb, movement_dir, movement_speed_kt, advisory_time, forecast_json)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
              .bind('EP02-2025-20250928-1800', 'BRAVO', 'EP', 'Depression', 10.5, -110.2, 30, 1008, 'WNW', 8, new Date(Date.now() - 90*60*1000).toISOString(), JSON.stringify([
                { t: 12, lat: 10.8, lng: -111.0, wind_kt: 30 },
                { t: 24, lat: 11.2, lng: -111.9, wind_kt: 35 },
                { t: 36, lat: 11.7, lng: -112.8, wind_kt: 35 }
              ]))
          ]
          // Sample wildfire cluster
          const wildfireInserts = [
            env.DB.prepare(`INSERT OR IGNORE INTO wildfire_clusters (cluster_key, centroid_lat, centroid_lng, detections_6h, detections_24h, growth_rate, area_estimate_km2, intensity_score, first_detected, last_detected)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
              .bind('demo-1', 38.45, -122.75, 12, 48, 0.25, 32.5, 77.3, new Date(Date.now() - 5*60*60*1000).toISOString(), new Date(Date.now() - 15*60*1000).toISOString())
          ]
          // Execute batched inserts
          await env.DB.batch([...cycloneInserts, ...wildfireInserts])
          // Count how many rows exist for seeded identifiers
          const cycloneCountRow = await env.DB.prepare("SELECT COUNT(*) as c FROM cyclones WHERE name IN ('ALPHA','BRAVO')").first<{ c: number }>()
          const wildfireCountRow = await env.DB.prepare("SELECT COUNT(*) as c FROM wildfire_clusters WHERE cluster_key = 'demo-1'").first<{ c: number }>()
          // Touch feed health rows
          const feeds = ['cyclones','nasa_firms']
          for (const f of feeds) {
            await env.DB.prepare("INSERT INTO feed_health (feed_name, last_success, status, notes) VALUES (?, ?, 'OK', 'Seeded') ON CONFLICT(feed_name) DO UPDATE SET last_success=excluded.last_success, status='OK', notes='Seeded', updated_at=strftime('%Y-%m-%dT%H:%M:%SZ','now')")
              .bind(f, nowIso).run()
          }
          // Purge related caches
          await Promise.all([
            cache.del(env, 'cyclones:latest'),
            cache.del(env, 'wildfire:clusters:50'),
            cache.del(env, 'feeds:health')
          ])
          return json({ success: true, data: {
            inserted: {
              cyclones_total_named: cycloneCountRow?.c ?? 0,
              wildfire_demo_clusters: wildfireCountRow?.c ?? 0
            },
            message: 'Phase 1 demo seed applied',
            refreshed_feeds: feeds
          } }, { headers: { ...cors } })
        } catch (e: any) {
          return json({ success: false, data: null, error: { code: 'seed_error', message: e?.message || String(e) } }, { status: 500, headers: { ...cors } })
        }
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
    // News endpoint - External RSS feeds removed (only GDACS and ReliefWeb remain for disaster data)
    if (url.pathname === '/api/news' && request.method === 'GET') {
      // Return empty news since external RSS feeds have been removed
      const body: APIResponse<any[]> = { success: true, data: [] }
      return json(body, { headers: { ...cors, 'cache-control': 'public, max-age=300' } })
    }
    // --- New Phase 1 Endpoints ---
    // Cyclones (latest advisory per storm name)
    if (url.pathname === '/api/cyclones' && request.method === 'GET') {
      try {
        const cacheKey = 'cyclones:latest'
        const cached = await cache.get(env, cacheKey)
        if (cached) {
          return new Response(cached, { headers: { 'content-type': 'application/json', ...cors } })
        }
        const rows = await env.DB.prepare(`
          WITH latest AS (
            SELECT *, ROW_NUMBER() OVER(PARTITION BY name ORDER BY advisory_time DESC) as rn
            FROM cyclones
          )
          SELECT id, external_id, name, basin, category, latitude, longitude, max_wind_kt, min_pressure_mb,
                 movement_dir, movement_speed_kt, advisory_time, forecast_json
          FROM latest WHERE rn=1 ORDER BY advisory_time DESC LIMIT 50`).all<any>()
        const data = (rows.results || []).map(r => ({
          id: String(r.id),
            name: r.name,
            basin: r.basin || undefined,
            category: r.category || undefined,
            position: (r.latitude != null && r.longitude != null) ? { lat: r.latitude, lng: r.longitude } : undefined,
            max_wind_kt: r.max_wind_kt || undefined,
            min_pressure_mb: r.min_pressure_mb || undefined,
            movement: (r.movement_dir || r.movement_speed_kt) ? { direction: r.movement_dir || undefined, speed_kt: r.movement_speed_kt || undefined } : undefined,
            advisory_time: r.advisory_time,
            forecast: r.forecast_json ? safeJsonArray(r.forecast_json) : undefined
        }))
        const body: APIResponse<any[]> = { success: true, data }
        const jsonStr = JSON.stringify(body)
        await cache.put(env, cacheKey, jsonStr, 300)
        return new Response(jsonStr, { headers: { 'content-type': 'application/json', ...cors, 'cache-control': 'public, max-age=300' } })
      } catch (e: any) {
        return json({ success: false, data: null, error: { code: 'cyclone_error', message: e?.message || String(e) } }, { status: 500, headers: { ...cors } })
      }
    }
    // Wildfire Clusters (recent by last_detected)
    if (url.pathname === '/api/wildfire/clusters' && request.method === 'GET') {
      try {
        const limit = Math.min(Number(url.searchParams.get('limit') || 50), 200)
        const cacheKey = `wildfire:clusters:${limit}`
        const cached = await cache.get(env, cacheKey)
        if (cached) {
          return new Response(cached, { headers: { 'content-type': 'application/json', ...cors } })
        }
        const rows = await env.DB.prepare(`SELECT id, cluster_key, centroid_lat, centroid_lng, detections_6h, detections_24h,
            growth_rate, area_estimate_km2, intensity_score, first_detected, last_detected, updated_at
          FROM wildfire_clusters ORDER BY last_detected DESC NULLS LAST, intensity_score DESC LIMIT ?`).bind(limit).all<any>()
        const data = (rows.results || []).map(r => ({
          id: String(r.id),
          cluster_key: r.cluster_key,
          centroid: { lat: r.centroid_lat, lng: r.centroid_lng },
          detections_6h: r.detections_6h,
          detections_24h: r.detections_24h,
          growth_rate: r.growth_rate || undefined,
          area_estimate_km2: r.area_estimate_km2 || undefined,
          intensity_score: r.intensity_score || undefined,
          first_detected: r.first_detected || undefined,
          last_detected: r.last_detected || undefined,
          trend: computeTrend(r.growth_rate)
        }))
        const body: APIResponse<any[]> = { success: true, data }
        const jsonStr = JSON.stringify(body)
        await cache.put(env, cacheKey, jsonStr, 120)
        return new Response(jsonStr, { headers: { 'content-type': 'application/json', ...cors, 'cache-control': 'public, max-age=120' } })
      } catch (e: any) {
        return json({ success: false, data: null, error: { code: 'wildfire_cluster_error', message: e?.message || String(e) } }, { status: 500, headers: { ...cors } })
      }
    }
    // Feed health status
    if (url.pathname === '/api/system/feeds' && request.method === 'GET') {
      try {
        const cacheKey = 'feeds:health'
        const cached = await cache.get(env, cacheKey)
        if (cached) {
          return new Response(cached, { headers: { 'content-type': 'application/json', ...cors } })
        }
        const rows = await env.DB.prepare(`SELECT feed_name, last_success, last_error, error_count, avg_latency_ms, consecutive_failures, status, notes, updated_at FROM feed_health ORDER BY feed_name`).all<any>()
        const now = Date.now()
        const data = (rows.results || []).map(r => ({
          feed: r.feed_name,
          status: (r.status || 'OK') as any,
          last_success: r.last_success || undefined,
          last_error: r.last_error || undefined,
          error_count: r.error_count || 0,
          avg_latency_ms: r.avg_latency_ms || undefined,
          consecutive_failures: r.consecutive_failures || 0,
          notes: r.notes || undefined,
          freshness_seconds: r.last_success ? Math.round((now - Date.parse(r.last_success)) / 1000) : undefined
        }))
        const body: APIResponse<any[]> = { success: true, data }
        const jsonStr = JSON.stringify(body)
        await cache.put(env, cacheKey, jsonStr, 60)
        return new Response(jsonStr, { headers: { 'content-type': 'application/json', ...cors, 'cache-control': 'public, max-age=60' } })
      } catch (e: any) {
        return json({ success: false, data: null, error: { code: 'feed_health_error', message: e?.message || String(e) } }, { status: 500, headers: { ...cors } })
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
        // Optimized single query with count - avoid duplicate WHERE clause execution
        let baseWhere = `WHERE is_active = 1`
        const params: any[] = []
        if (type) { baseWhere += ` AND disaster_type = ?`; params.push(type) }
        if (severity) { baseWhere += ` AND severity = ?`; params.push(severity.toUpperCase()) }
        if (country) { baseWhere += ` AND country = ?`; params.push(country) }
        if (q) { 
          baseWhere += ` AND (title LIKE ? OR country LIKE ? OR disaster_type LIKE ?)`
          const pat = `%${q}%`
          params.push(pat, pat, pat) 
        }

        // Combined query for both count and data using window functions
        const combinedSql = `
          WITH filtered AS (
            SELECT id, external_id, disaster_type, severity, title, country, 
                   coordinates_lat, coordinates_lng, event_timestamp, affected_population,
                   COUNT(*) OVER() as total_count
            FROM disasters ${baseWhere}
            ORDER BY event_timestamp DESC
            LIMIT ? OFFSET ?
          )
          SELECT * FROM filtered
        `
        const allParams = [...params, limit, offset]
        const rows = await env.DB.prepare(combinedSql).bind(...allParams).all<DisasterRow & { total_count: number }>()
        const total = rows.results[0]?.total_count ?? 0
        const items: Disaster[] = rows.results.map(r => ({
          id: String(r.id),
          type: r.disaster_type,
          severity: mapSeverityToClient(r.severity),
          country: r.country || undefined,
          latitude: r.coordinates_lat ?? undefined,
          longitude: r.coordinates_lng ?? undefined,
          title: sanitizeText(r.title) || r.title,
          occurred_at: r.event_timestamp,
          affected_population: r.affected_population || undefined,
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
    // Single disaster details - must be after more specific routes
    if (url.pathname.startsWith('/api/disasters/') && request.method === 'GET' && 
        !url.pathname.includes('/summary') && !url.pathname.includes('/history') && 
        !url.pathname.includes('/current') && !url.pathname.includes('/eq-report')) {
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
    // Single optimized query to get all summary data at once
    const summaryQuery = `
      SELECT 
        disaster_type,
        severity,
        COUNT(*) as count,
        SUM(COALESCE(affected_population, 0)) as affected_population,
        SUM(CASE WHEN event_timestamp >= datetime('now', '-1 day') THEN 1 ELSE 0 END) as recent_24h
      FROM disasters 
      WHERE is_active = 1 
      GROUP BY disaster_type, severity
    `
    const summaryRows = await env.DB.prepare(summaryQuery).all<{
      disaster_type: string;
      severity: string;
      count: number;
      affected_population: number;
      recent_24h: number;
    }>()
    
    // Process results into required format
    const totals: { type: string; count: number }[] = []
    const severityBreakdown: { severity: string; count: number }[] = []
    let totalAffected = 0
    let recent24Count = 0
    
    const typeMap = new Map<string, number>()
    const sevMap = new Map<string, number>()
    
    for (const row of summaryRows.results) {
      typeMap.set(row.disaster_type, (typeMap.get(row.disaster_type) || 0) + row.count)
      sevMap.set(row.severity, (sevMap.get(row.severity) || 0) + row.count)
      totalAffected += row.affected_population
      recent24Count += row.recent_24h
    }
    
    totals.push(...Array.from(typeMap.entries()).map(([type, count]) => ({ type, count })))
    severityBreakdown.push(...Array.from(sevMap.entries()).map(([severity, count]) => ({ severity, count })))
    
    const economicEstimate = Math.round(totalAffected * 150) // simple placeholder estimate in USD
  const body: APIResponse<{ totals: { type: string; count: number }[]; severity_breakdown: { severity: string; count: number }[]; total_affected_population: number; recent_24h: number; economic_impact_estimate_usd: number }> = { success: true, data: { totals, severity_breakdown: severityBreakdown, total_affected_population: totalAffected, recent_24h: recent24Count, economic_impact_estimate_usd: economicEstimate } }
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
  const sql = `SELECT id, external_id, disaster_type, severity, title, country, coordinates_lat, coordinates_lng, event_timestamp, affected_population
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
          affected_population: r.affected_population || undefined,
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
    
    // Enhanced country details endpoint with population, coordinates, and regional data
    if (url.pathname === '/api/countries/enhanced' && request.method === 'GET') {
      try {
        if (!env.DB) throw new Error('DB not bound; using mock')
        const cacheKey = 'countries:enhanced'
        const cached = await cache.get(env, cacheKey)
        if (cached) {
          return new Response(cached, { headers: { 'content-type': 'application/json', ...cors } })
        }
        const sql = `SELECT code, name, region, subregion, population, coordinates_lat, coordinates_lng FROM countries ORDER BY name`
        const rows = await env.DB.prepare(sql).all<{ 
          code: string; 
          name: string; 
          region: string | null; 
          subregion: string | null; 
          population: number | null; 
          coordinates_lat: number | null; 
          coordinates_lng: number | null; 
        }>()
        const body: APIResponse<typeof rows.results> = { success: true, data: rows.results }
        const jsonStr = JSON.stringify(body)
        await cache.put(env, cacheKey, jsonStr, 3600)
        return new Response(jsonStr, { headers: { 'content-type': 'application/json', ...cors } })
      } catch (err) {
        // Minimal fallback list
        const data = [
          { code: 'US', name: 'United States', region: 'Americas', subregion: 'North America', population: 329484123, coordinates_lat: 38, coordinates_lng: -97 },
          { code: 'NG', name: 'Nigeria', region: 'Africa', subregion: 'Western Africa', population: 206139587, coordinates_lat: 10, coordinates_lng: 8 }
        ]
        return json({ success: true, data, meta: { fallback: true } }, { headers: { ...cors } })
      }
    }
    
    // Single country details endpoint
    if (url.pathname.startsWith('/api/countries/') && request.method === 'GET' && 
        !url.pathname.endsWith('/enhanced') && url.pathname.split('/').length === 4) {
      const countryCode = url.pathname.split('/').pop()!.toUpperCase()
      try {
        if (!env.DB) throw new Error('DB not bound; using mock')
        const cacheKey = `country:details:${countryCode}`
        const cached = await cache.get(env, cacheKey)
        if (cached) {
          return new Response(cached, { headers: { 'content-type': 'application/json', ...cors } })
        }
        const sql = `SELECT * FROM countries WHERE code = ? LIMIT 1`
        const row = await env.DB.prepare(sql).bind(countryCode).first<any>()
        if (!row) {
          return json({ success: false, data: null, error: { code: 'not_found', message: 'Country not found' } }, { status: 404, headers: { ...cors } })
        }
        const body: APIResponse<typeof row> = { success: true, data: row }
        const jsonStr = JSON.stringify(body)
        await cache.put(env, cacheKey, jsonStr, 3600)
        return new Response(jsonStr, { headers: { 'content-type': 'application/json', ...cors } })
      } catch (err) {
        return json({ success: false, data: null, error: { code: 'server_error', message: 'Database error' } }, { status: 500, headers: { ...cors } })
      }
    }

    // User authentication endpoints
    if (url.pathname === '/api/auth/register' && request.method === 'POST') {
      try {
        const body = await request.json().catch(() => ({})) as any
        const { firstName, lastName, email, password } = body

        // Validate input
        if (!firstName?.trim() || !lastName?.trim() || !email?.trim() || !password) {
          return json({ success: false, data: null, error: { code: 'validation_error', message: 'All fields are required' } }, { status: 400, headers: { ...cors } })
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email.toLowerCase())) {
          return json({ success: false, data: null, error: { code: 'validation_error', message: 'Invalid email format' } }, { status: 400, headers: { ...cors } })
        }

        // Validate password strength
        if (password.length < 8) {
          return json({ success: false, data: null, error: { code: 'validation_error', message: 'Password must be at least 8 characters long' } }, { status: 400, headers: { ...cors } })
        }

        // Check if user already exists
        const existingUser = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email.toLowerCase()).first()
        if (existingUser) {
          return json({ success: false, data: null, error: { code: 'user_exists', message: 'User with this email already exists' } }, { status: 409, headers: { ...cors } })
        }

        // Hash password using Web Crypto API
        const encoder = new TextEncoder()
        const data = encoder.encode(password)
        const salt = crypto.getRandomValues(new Uint8Array(16))
        const key = await crypto.subtle.importKey('raw', data, { name: 'PBKDF2' }, false, ['deriveBits'])
        const derivedBits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: salt, iterations: 100000, hash: 'SHA-256' }, key, 256)
        const hashArray = new Uint8Array(salt.length + derivedBits.byteLength)
        hashArray.set(salt)
        hashArray.set(new Uint8Array(derivedBits), salt.length)
        const passwordHash = btoa(String.fromCharCode(...hashArray))

        // Create user
        const result = await env.DB.prepare(`
          INSERT INTO users (email, password_hash, first_name, last_name)
          VALUES (?, ?, ?, ?)
        `).bind(email.toLowerCase(), passwordHash, firstName.trim(), lastName.trim()).run()

        const userId = result.meta.last_row_id

        // Create default preferences
        await env.DB.prepare(`
          INSERT INTO user_preferences (user_id)
          VALUES (?)
        `).bind(userId).run()

        // Create default alert settings
        await env.DB.prepare(`
          INSERT INTO user_alert_settings (user_id)
          VALUES (?)
        `).bind(userId).run()

        // Generate JWT token
        const payload = { userId, email: email.toLowerCase() }
        const jwtSecret = env.JWT_SECRET || 'default-secret'
        const now = Math.floor(Date.now() / 1000)
        const expiresIn = 24 * 60 * 60 // 24 hours
        const claims = { ...payload, iat: now, exp: now + expiresIn }
        
        const header = { alg: 'HS256', typ: 'JWT' }
        const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
        const payloadB64 = btoa(JSON.stringify(claims)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
        const data2 = `${headerB64}.${payloadB64}`
        const key2 = await crypto.subtle.importKey('raw', encoder.encode(jwtSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
        const signature = await crypto.subtle.sign('HMAC', key2, encoder.encode(data2))
        const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
        const token = `${data2}.${signatureB64}`

        // Store session
        const tokenHashData = encoder.encode(token)
        const tokenHashBuffer = await crypto.subtle.digest('SHA-256', tokenHashData)
        const tokenHash = btoa(String.fromCharCode(...new Uint8Array(tokenHashBuffer)))
        const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()

        await env.DB.prepare(`
          INSERT INTO user_sessions (user_id, token_hash, expires_at)
          VALUES (?, ?, ?)
        `).bind(userId, tokenHash, expiresAt).run()

        return json({
          success: true,
          data: {
            user: {
              id: userId,
              email: email.toLowerCase(),
              firstName,
              lastName
            },
            token
          }
        }, { headers: { ...cors } })

      } catch (error: any) {
        return json({ success: false, data: null, error: { code: 'registration_error', message: error.message || 'Failed to create user' } }, { status: 500, headers: { ...cors } })
      }
    }

    if (url.pathname === '/api/auth/login' && request.method === 'POST') {
      try {
        const body = await request.json().catch(() => ({})) as any
        const { email, password } = body

        if (!email?.trim() || !password) {
          return json({ success: false, data: null, error: { code: 'validation_error', message: 'Email and password are required' } }, { status: 400, headers: { ...cors } })
        }

        // Get user from database
        const user = await env.DB.prepare(`
          SELECT id, email, password_hash, first_name, last_name, is_active
          FROM users WHERE email = ?
        `).bind(email.toLowerCase()).first<any>()

        if (!user || !user.is_active) {
          return json({ success: false, data: null, error: { code: 'invalid_credentials', message: 'Invalid email or password' } }, { status: 401, headers: { ...cors } })
        }

        // Verify password
        const encoder = new TextEncoder()
        const data = encoder.encode(password)
        const hashBytes = new Uint8Array(atob(user.password_hash).split('').map((char: string) => char.charCodeAt(0)))
        const salt = hashBytes.slice(0, 16)
        const storedHash = hashBytes.slice(16)
        const key = await crypto.subtle.importKey('raw', data, { name: 'PBKDF2' }, false, ['deriveBits'])
        const derivedBits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: salt, iterations: 100000, hash: 'SHA-256' }, key, 256)
        const newHash = new Uint8Array(derivedBits)
        
        let match = newHash.length === storedHash.length
        for (let i = 0; i < newHash.length && match; i++) {
          if (newHash[i] !== storedHash[i]) match = false
        }

        if (!match) {
          return json({ success: false, data: null, error: { code: 'invalid_credentials', message: 'Invalid email or password' } }, { status: 401, headers: { ...cors } })
        }

        // Generate JWT token
        const payload = { userId: user.id, email: user.email }
        const jwtSecret = env.JWT_SECRET || 'default-secret'
        const now = Math.floor(Date.now() / 1000)
        const expiresIn = 24 * 60 * 60 // 24 hours
        const claims = { ...payload, iat: now, exp: now + expiresIn }
        
        const header = { alg: 'HS256', typ: 'JWT' }
        const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
        const payloadB64 = btoa(JSON.stringify(claims)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
        const data2 = `${headerB64}.${payloadB64}`
        const key2 = await crypto.subtle.importKey('raw', encoder.encode(jwtSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
        const signature = await crypto.subtle.sign('HMAC', key2, encoder.encode(data2))
        const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
        const token = `${data2}.${signatureB64}`

        // Store session
        const tokenHashData = encoder.encode(token)
        const tokenHashBuffer = await crypto.subtle.digest('SHA-256', tokenHashData)
        const tokenHash = btoa(String.fromCharCode(...new Uint8Array(tokenHashBuffer)))
        const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()

        await env.DB.prepare(`
          INSERT INTO user_sessions (user_id, token_hash, expires_at)
          VALUES (?, ?, ?)
        `).bind(user.id, tokenHash, expiresAt).run()

        // Update last login
        await env.DB.prepare('UPDATE users SET last_login = datetime("now") WHERE id = ?').bind(user.id).run()

        return json({
          success: true,
          data: {
            user: {
              id: user.id,
              email: user.email,
              firstName: user.first_name,
              lastName: user.last_name
            },
            token
          }
        }, { headers: { ...cors } })

      } catch (error: any) {
        return json({ success: false, data: null, error: { code: 'login_error', message: error.message || 'Login failed' } }, { status: 500, headers: { ...cors } })
      }
    }

    if (url.pathname === '/api/auth/logout' && request.method === 'POST') {
      try {
        const authHeader = request.headers.get('Authorization')
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const token = authHeader.substring(7)
          const encoder = new TextEncoder()
          const tokenHashData = encoder.encode(token)
          const tokenHashBuffer = await crypto.subtle.digest('SHA-256', tokenHashData)
          const tokenHash = btoa(String.fromCharCode(...new Uint8Array(tokenHashBuffer)))
          
          // Remove session from database
          await env.DB.prepare('DELETE FROM user_sessions WHERE token_hash = ?').bind(tokenHash).run()
        }

        return json({ success: true, data: { message: 'Logged out successfully' } }, { headers: { ...cors } })
      } catch (error: any) {
        return json({ success: false, data: null, error: { code: 'logout_error', message: 'Logout failed' } }, { status: 500, headers: { ...cors } })
      }
    }

    if (url.pathname === '/api/user/profile' && request.method === 'GET') {
      try {
        const authHeader = request.headers.get('Authorization')
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return json({ success: false, data: null, error: { code: 'unauthorized', message: 'Authentication required' } }, { status: 401, headers: { ...cors } })
        }

        const token = authHeader.substring(7)
        const encoder = new TextEncoder()
        const tokenHashData = encoder.encode(token)
        const tokenHashBuffer = await crypto.subtle.digest('SHA-256', tokenHashData)
        const tokenHash = btoa(String.fromCharCode(...new Uint8Array(tokenHashBuffer)))

        // Get user from session
        const session = await env.DB.prepare(`
          SELECT user_id FROM user_sessions 
          WHERE token_hash = ? AND expires_at > datetime("now")
        `).bind(tokenHash).first<any>()

        if (!session) {
          return json({ success: false, data: null, error: { code: 'unauthorized', message: 'Invalid or expired token' } }, { status: 401, headers: { ...cors } })
        }

        // Get user profile with preferences and alert settings
        const profile = await env.DB.prepare(`
          SELECT 
            u.id, u.email, u.first_name, u.last_name, u.last_login, u.created_at,
            p.theme, p.language, p.timezone, p.email_notifications, p.push_notifications,
            a.countries, a.disaster_types, a.severity_levels, a.email_digest, a.instant_alerts
          FROM users u
          LEFT JOIN user_preferences p ON u.id = p.user_id
          LEFT JOIN user_alert_settings a ON u.id = a.user_id
          WHERE u.id = ? AND u.is_active = 1
        `).bind(session.user_id).first<any>()

        if (!profile) {
          return json({ success: false, data: null, error: { code: 'not_found', message: 'User not found' } }, { status: 404, headers: { ...cors } })
        }

        return json({
          success: true,
          data: {
            id: profile.id,
            email: profile.email,
            firstName: profile.first_name,
            lastName: profile.last_name,
            lastLogin: profile.last_login,
            joinedAt: profile.created_at,
            preferences: {
              theme: profile.theme || 'system',
              language: profile.language || 'en',
              timezone: profile.timezone || 'UTC',
              emailNotifications: Boolean(profile.email_notifications),
              pushNotifications: Boolean(profile.push_notifications)
            },
            alertSettings: {
              countries: profile.countries ? JSON.parse(profile.countries) : [],
              disasterTypes: profile.disaster_types ? JSON.parse(profile.disaster_types) : [],
              severityLevels: profile.severity_levels ? JSON.parse(profile.severity_levels) : ['RED', 'ORANGE'],
              emailDigest: Boolean(profile.email_digest),
              instantAlerts: Boolean(profile.instant_alerts)
            }
          }
        }, { headers: { ...cors } })

      } catch (error: any) {
        return json({ success: false, data: null, error: { code: 'profile_error', message: error.message || 'Failed to get profile' } }, { status: 500, headers: { ...cors } })
      }
    }

    if (url.pathname === '/api/user/profile' && request.method === 'PUT') {
      try {
        const authHeader = request.headers.get('Authorization')
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return json({ success: false, data: null, error: { code: 'unauthorized', message: 'Authentication required' } }, { status: 401, headers: { ...cors } })
        }

        const token = authHeader.substring(7)
        const encoder = new TextEncoder()
        const tokenHashData = encoder.encode(token)
        const tokenHashBuffer = await crypto.subtle.digest('SHA-256', tokenHashData)
        const tokenHash = btoa(String.fromCharCode(...new Uint8Array(tokenHashBuffer)))

        // Get user from session
        const session = await env.DB.prepare(`
          SELECT user_id FROM user_sessions 
          WHERE token_hash = ? AND expires_at > datetime("now")
        `).bind(tokenHash).first<any>()

        if (!session) {
          return json({ success: false, data: null, error: { code: 'unauthorized', message: 'Invalid or expired token' } }, { status: 401, headers: { ...cors } })
        }

        const body = await request.json().catch(() => ({})) as any
        const { firstName, lastName, preferences, alertSettings } = body

        // Update user basic info if provided
        if (firstName || lastName) {
          await env.DB.prepare(`
            UPDATE users SET 
              first_name = COALESCE(?, first_name),
              last_name = COALESCE(?, last_name),
              updated_at = datetime("now")
            WHERE id = ?
          `).bind(firstName?.trim(), lastName?.trim(), session.user_id).run()
        }

        // Update preferences if provided
        if (preferences) {
          await env.DB.prepare(`
            UPDATE user_preferences SET
              theme = COALESCE(?, theme),
              language = COALESCE(?, language),
              timezone = COALESCE(?, timezone),
              email_notifications = COALESCE(?, email_notifications),
              push_notifications = COALESCE(?, push_notifications),
              updated_at = datetime("now")
            WHERE user_id = ?
          `).bind(
            preferences.theme,
            preferences.language,
            preferences.timezone,
            preferences.emailNotifications !== undefined ? (preferences.emailNotifications ? 1 : 0) : null,
            preferences.pushNotifications !== undefined ? (preferences.pushNotifications ? 1 : 0) : null,
            session.user_id
          ).run()
        }

        // Update alert settings if provided
        if (alertSettings) {
          await env.DB.prepare(`
            UPDATE user_alert_settings SET
              countries = COALESCE(?, countries),
              disaster_types = COALESCE(?, disaster_types),
              severity_levels = COALESCE(?, severity_levels),
              email_digest = COALESCE(?, email_digest),
              instant_alerts = COALESCE(?, instant_alerts),
              updated_at = datetime("now")
            WHERE user_id = ?
          `).bind(
            alertSettings.countries ? JSON.stringify(alertSettings.countries) : null,
            alertSettings.disasterTypes ? JSON.stringify(alertSettings.disasterTypes) : null,
            alertSettings.severityLevels ? JSON.stringify(alertSettings.severityLevels) : null,
            alertSettings.emailDigest !== undefined ? (alertSettings.emailDigest ? 1 : 0) : null,
            alertSettings.instantAlerts !== undefined ? (alertSettings.instantAlerts ? 1 : 0) : null,
            session.user_id
          ).run()
        }

        return json({ success: true, data: { message: 'Profile updated successfully' } }, { headers: { ...cors } })

      } catch (error: any) {
        return json({ success: false, data: null, error: { code: 'update_error', message: error.message || 'Failed to update profile' } }, { status: 500, headers: { ...cors } })
      }
    }

    return new Response('Not found', { status: 404 })
  }
}
