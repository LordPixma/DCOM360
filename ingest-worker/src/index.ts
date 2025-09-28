import { parseEmail, parseEmailMulti, type ParsedEmail } from './parser'
import { parseGdacsFeed } from './gdacs'
import { parseReliefwebFeed } from './reliefweb'
import { parseUSGSFeed } from './usgs'
import { parseNOAACAPFeed } from './noaa-cap'
import { fetchFIRMSGlobalData, type ParsedFIRMSItem } from './nasa-firms'
// Phase 1 extended ingestion modules
import { ingestCyclones } from './cyclones'
import { computeWildfireClusters } from './wildfire-clusters'
import { updateFeedHealth } from './feed-health'
import PostalMime from 'postal-mime'

type Env = {
  DB: D1Database
  CACHE: KVNamespace
  INGEST_SECRET?: string
  INGEST_TOKEN?: string
  GDACS_RSS_URL?: string
  RELIEFWEB_RSS_URL?: string
  USGS_RSS_URL?: string
  NOAA_CAP_RSS_URL?: string
  NASA_FIRMS_MAP_KEY?: string
  ALLOW_FROM?: string
}

// Minimal ForwardableEmailMessage type for Email Workers
type EmailMessage = {
  raw: ReadableStream
  headers: Headers
  from?: string
  to?: string
  setReject?: (reason: string) => void
  forward?: (rcptTo: string, headers?: Headers) => Promise<void>
}

function json(data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json' }, ...init })
}

// Coerce incoming disaster types to a known set for consistency in DB and API
function normalizeDisasterType(type: string | undefined, title?: string, description?: string): 'earthquake'|'cyclone'|'flood'|'wildfire'|'landslide'|'drought'|'other' {
  const v = (type || '').toLowerCase().trim()
  const text = `${title || ''} ${description || ''}`.toLowerCase()
  const hay = (v + ' ' + text)
  
  if (/earth\s*quake|\bquake\b|m\s*\d+(?:\.\d+)?\s*earth/.test(hay)) return 'earthquake'
  if (/tropical[_\s-]*cyclone|\bcyclone\b|\btyphoon\b|\bhurricane\b|\btc[-_\s]?\d*/.test(hay)) return 'cyclone'
  if (/\bflood|flooding|flash\s+flood/.test(hay)) return 'flood'
  if (/wild\s*fire|forest\s*fire|\bwildfire\b|fire\s+alert/.test(hay)) return 'wildfire'
  if (/landslide|mudslide|debris\s+flow|slope\s+failure/.test(hay)) return 'landslide'
  if (/drought|water\s+scarcity|dry\s+spell/.test(hay)) return 'drought'
  
  // Map additional ReliefWeb types to 'other'
  if (/volcano|volcanic|eruption|heatwave|heat\s+wave|epidemic|cholera|ebola|diphtheria|outbreak/.test(hay)) return 'other'
  
  return 'other'
}

// Purge records older than 24 hours to prevent database growth
async function purgeOldRecords(env: Env): Promise<{ purgedDisasters: number; purgedHistory: number; purgedLogs: number; error?: string }> {
  try {
    const cutoffTimestamp = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 24 hours ago
    
    // Get count of disasters to be purged (for logging)
    const disasterCountResult = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM disasters WHERE event_timestamp < ? OR updated_at < ?'
    ).bind(cutoffTimestamp, cutoffTimestamp).first<{ count: number }>()
    const disastersToPurge = disasterCountResult?.count || 0
    
    // Get count of history records to be purged
    const historyCountResult = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM disaster_history WHERE changed_at < ?'
    ).bind(cutoffTimestamp).first<{ count: number }>()
    const historyToPurge = historyCountResult?.count || 0
    
    // Get count of processing logs to be purged
    const logsCountResult = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM processing_logs WHERE processing_timestamp < ?'
    ).bind(cutoffTimestamp).first<{ count: number }>()
    const logsToPurge = logsCountResult?.count || 0
    
    // Execute purge operations in a transaction-like manner
    const results = await Promise.allSettled([
      // Delete old disasters (older than 24 hours based on event_timestamp or updated_at)
      env.DB.prepare('DELETE FROM disasters WHERE event_timestamp < ? OR updated_at < ?')
        .bind(cutoffTimestamp, cutoffTimestamp).run(),
      
      // Delete low-confidence fire detections immediately (confidence < 85%)
      env.DB.prepare(`DELETE FROM disasters WHERE disaster_type = 'wildfire' AND external_id LIKE 'firms-%' AND (
        description LIKE '%Confidence: 1%' OR description LIKE '%Confidence: 2%' OR description LIKE '%Confidence: 3%' OR
        description LIKE '%Confidence: 4%' OR description LIKE '%Confidence: 5%' OR description LIKE '%Confidence: 6%' OR
        description LIKE '%Confidence: 7%' OR description LIKE '%Confidence: 8%' OR description LIKE '%Low%' OR description LIKE '%Medium%'
      )`).run(),
      
      // Delete old disaster history records
      env.DB.prepare('DELETE FROM disaster_history WHERE changed_at < ?')
        .bind(cutoffTimestamp).run(),
      
      // Delete old processing logs
      env.DB.prepare('DELETE FROM processing_logs WHERE processing_timestamp < ?')
        .bind(cutoffTimestamp).run()
    ])
    
    // Check if any operations failed
    const failedOperations = results.filter(result => result.status === 'rejected')
    if (failedOperations.length > 0) {
      const errors = failedOperations.map(op => (op as PromiseRejectedResult).reason?.message || 'Unknown error')
      return { 
        purgedDisasters: 0, 
        purgedHistory: 0, 
        purgedLogs: 0, 
        error: `Purge operations failed: ${errors.join(', ')}` 
      }
    }
    
    return {
      purgedDisasters: disastersToPurge,
      purgedHistory: historyToPurge,
      purgedLogs: logsToPurge
    }
  } catch (error: any) {
    return {
      purgedDisasters: 0,
      purgedHistory: 0,
      purgedLogs: 0,
      error: error?.message || String(error)
    }
  }
}

async function processParsedEmail(parsed: ParsedEmail, env: Env): Promise<{ newDisasters: number; updatedDisasters: number; error?: string }>{
  try {
  const normType = normalizeDisasterType(parsed.disaster_type, parsed.title, parsed.description)
    // Try the modern schema first (with external_id); fallback to legacy schema (id TEXT PK)
    let existing: { id: any; severity: string } | null = null
    let useLegacy = false
    try {
      existing = await env.DB.prepare('SELECT id, severity FROM disasters WHERE external_id = ?').bind(parsed.external_id).first<{ id: any; severity: string }>()
    } catch (err: any) {
      if (String(err?.message || err).toLowerCase().includes('no such column: external_id')) {
        useLegacy = true
        existing = await env.DB.prepare('SELECT id, severity FROM disasters WHERE id = ?').bind(parsed.external_id).first<{ id: any; severity: string }>()
      } else {
        throw err
      }
    }

    let newDisasters = 0
    let updatedDisasters = 0
    if (!existing) {
      if (useLegacy) {
        // Minimal columns on legacy schema (affected_population may not exist in legacy schema)
        await env.DB.prepare(`INSERT INTO disasters (id, disaster_type, severity, title, country, coordinates_lat, coordinates_lng, event_timestamp, is_active)
                              VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`).
          bind(parsed.external_id, normType, parsed.severity, parsed.title, parsed.country || null, parsed.coordinates_lat ?? null, parsed.coordinates_lng ?? null, parsed.event_timestamp).
          run()
      } else {
        await env.DB.prepare(`INSERT INTO disasters (external_id, disaster_type, severity, title, country, coordinates_lat, coordinates_lng, event_timestamp, description, affected_population)
                              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
          .bind(parsed.external_id, normType, parsed.severity, parsed.title, parsed.country || null, parsed.coordinates_lat ?? null, parsed.coordinates_lng ?? null, parsed.event_timestamp, parsed.description || null, parsed.affected_population ?? null)
          .run()
      }
      newDisasters = 1
    } else {
      if (useLegacy) {
        await env.DB.prepare(`UPDATE disasters SET disaster_type = ?, severity = ?, title = ?, country = ?, coordinates_lat = ?, coordinates_lng = ?, event_timestamp = ? WHERE id = ?`)
          .bind(normType, parsed.severity, parsed.title, parsed.country || null, parsed.coordinates_lat ?? null, parsed.coordinates_lng ?? null, parsed.event_timestamp, parsed.external_id)
          .run()
      } else {
        await env.DB.prepare(`UPDATE disasters SET disaster_type = ?, severity = ?, title = ?, country = ?, coordinates_lat = ?, coordinates_lng = ?, event_timestamp = ?, description = ?, affected_population = ?, updated_at = CURRENT_TIMESTAMP WHERE external_id = ?`)
          .bind(normType, parsed.severity, parsed.title, parsed.country || null, parsed.coordinates_lat ?? null, parsed.coordinates_lng ?? null, parsed.event_timestamp, parsed.description || null, parsed.affected_population ?? null, parsed.external_id)
          .run()
      }
      if (existing.severity !== parsed.severity) {
        await env.DB.prepare(`INSERT INTO disaster_history (disaster_id, severity_old, severity_new, change_reason)
                              VALUES (?, ?, ?, ?)`).
          bind(existing.id, existing.severity, parsed.severity, 'email_update').
          run()
      }
      updatedDisasters = 1
    }

    // Optimized cache invalidation - use wildcard patterns where supported
    if (env.CACHE) {
      // Clear specific high-traffic keys and let other cache entries expire naturally
      const criticalKeys = [
        'disasters:summary',
        'disasters:current:all:all:all:none:50:0', // Most common query
      ]
      await Promise.all(criticalKeys.map((k) => env.CACHE!.delete(k).catch(() => {})))
    }

    return { newDisasters, updatedDisasters }
  } catch (e: any) {
    return { newDisasters: 0, updatedDisasters: 0, error: e?.message || String(e) }
  }
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url)
  // Normalize path to avoid trailing-slash mismatches
  const pathname = (url.pathname.replace(/\/+$/g, '') || '/')

  if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'POST,OPTIONS', 'access-control-allow-headers': 'content-type,authorization' } })
    }
  // Manual trigger to pull GDACS RSS now
    if (req.method === 'POST' && pathname === '/ingest/gdacs') {
      try {
        const auth = req.headers.get('authorization') || ''
        const token = auth.replace(/^Bearer\s+/i, '')
        const expected = env.INGEST_SECRET ?? env.INGEST_TOKEN
        if (!expected || token !== expected) {
          return json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid token' } }, { status: 401 })
        }
        const rssUrl = env.GDACS_RSS_URL || 'https://www.gdacs.org/xml/rss.xml'
        const res = await fetch(rssUrl, { cf: { cacheTtl: 60, cacheEverything: true } as any })
        if (!res.ok) return json({ success: false, error: { code: 'UPSTREAM', message: `GDACS fetch ${res.status}` } }, { status: 502 })
        const xml = await res.text()
        const items = parseGdacsFeed(xml).slice(0, 10)
        let newDisasters = 0
        let updatedDisasters = 0
        const errors: Array<{ id: string; error: string }> = []
        
        // Process items in parallel with limited concurrency to avoid DB lock issues
        const processChunk = async (chunk: any[]) => {
          const results = await Promise.allSettled(chunk.map(p => processParsedEmail(p, env)))
          for (let i = 0; i < results.length; i++) {
            const result = results[i]
            if (result.status === 'fulfilled') {
              const r = result.value
              newDisasters += r.newDisasters
              updatedDisasters += r.updatedDisasters
              if (r.error) errors.push({ id: chunk[i].external_id, error: r.error })
            } else {
              errors.push({ id: chunk[i].external_id, error: result.reason?.message || 'Processing failed' })
            }
          }
        }
        
        // Process in chunks of 3 to avoid overwhelming D1
        for (let i = 0; i < items.length; i += 3) {
          const chunk = items.slice(i, i + 3)
          await processChunk(chunk)
        }
        if (env.CACHE) {
          const keys = ['disasters:summary','disasters:current:all:all:all:50:0','disasters:history:7','countries:list']
          await Promise.all(keys.map((k) => env.CACHE!.delete(k).catch(() => {})))
        }
        if (errors.length) {
          return json({ success: false, error: { code: 'PARTIAL_FAIL', message: 'Some items failed', details: errors }, data: { processed: items.length, newDisasters, updatedDisasters } }, { status: 207 })
        }
        return json({ success: true, data: { processed: items.length, newDisasters, updatedDisasters } })
      } catch (err: any) {
        const message = err?.message || String(err)
        return json({ success: false, error: { code: 'INGEST_ERROR', message } }, { status: 500 })
      }
    }
    // Manual trigger to pull ReliefWeb RSS now
    if (req.method === 'POST' && pathname === '/ingest/reliefweb') {
      try {
        const auth = req.headers.get('authorization') || ''
        const token = auth.replace(/^Bearer\s+/i, '')
        const expected = env.INGEST_SECRET ?? env.INGEST_TOKEN
        if (!expected || token !== expected) {
          return json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid token' } }, { status: 401 })
        }
        const rssUrl = env.RELIEFWEB_RSS_URL || 'https://reliefweb.int/disasters/rss.xml'
        const res = await fetch(rssUrl, { cf: { cacheTtl: 120, cacheEverything: true } as any })
        if (!res.ok) return json({ success: false, error: { code: 'UPSTREAM', message: `ReliefWeb fetch ${res.status}` } }, { status: 502 })
        const xml = await res.text()
        const items = parseReliefwebFeed(xml).slice(0, 20)
        let newDisasters = 0
        let updatedDisasters = 0
        const errors: Array<{ id: string; error: string }> = []
        
        // Process items in parallel chunks
        const processChunk = async (chunk: any[]) => {
          const results = await Promise.allSettled(chunk.map(p => processParsedEmail(p, env)))
          for (let i = 0; i < results.length; i++) {
            const result = results[i]
            if (result.status === 'fulfilled') {
              const r = result.value
              newDisasters += r.newDisasters
              updatedDisasters += r.updatedDisasters
              if (r.error) errors.push({ id: chunk[i].external_id, error: r.error })
            } else {
              errors.push({ id: chunk[i].external_id, error: result.reason?.message || 'Processing failed' })
            }
          }
        }
        
        // Process in chunks of 5 for ReliefWeb (typically has more items)
        for (let i = 0; i < items.length; i += 5) {
          const chunk = items.slice(i, i + 5)
          await processChunk(chunk)
        }
        if (env.CACHE) {
          const keys = ['disasters:summary','disasters:current:all:all:all:50:0','disasters:history:7','countries:list']
          await Promise.all(keys.map((k) => env.CACHE!.delete(k).catch(() => {})))
        }
        if (errors.length) {
          return json({ success: false, error: { code: 'PARTIAL_FAIL', message: 'Some items failed', details: errors }, data: { processed: items.length, newDisasters, updatedDisasters } }, { status: 207 })
        }
        return json({ success: true, data: { processed: items.length, newDisasters, updatedDisasters } })
      } catch (err: any) {
        const message = err?.message || String(err)
        return json({ success: false, error: { code: 'INGEST_ERROR', message } }, { status: 500 })
      }
    }

    // Manual trigger to pull USGS RSS now
    if (req.method === 'POST' && pathname === '/ingest/usgs') {
      try {
        const auth = req.headers.get('authorization') || ''
        const token = auth.replace(/^Bearer\s+/i, '')
        const expected = env.INGEST_SECRET ?? env.INGEST_TOKEN
        if (!expected || token !== expected) {
          return json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid token' } }, { status: 401 })
        }
        const rssUrl = env.USGS_RSS_URL || 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_month.atom'
        const res = await fetch(rssUrl, { cf: { cacheTtl: 300, cacheEverything: true } as any })
        if (!res.ok) return json({ success: false, error: { code: 'UPSTREAM', message: `USGS fetch ${res.status}` } }, { status: 502 })
        const xml = await res.text()
        const items = parseUSGSFeed(xml).slice(0, 15)
        let newDisasters = 0
        let updatedDisasters = 0
        const errors: Array<{ id: string; error: string }> = []
        
        // Process items in parallel chunks
        const processChunk = async (chunk: any[]) => {
          const results = await Promise.allSettled(chunk.map(p => processParsedEmail(p, env)))
          for (let i = 0; i < results.length; i++) {
            const result = results[i]
            if (result.status === 'fulfilled') {
              const r = result.value
              newDisasters += r.newDisasters
              updatedDisasters += r.updatedDisasters
              if (r.error) errors.push({ id: chunk[i].external_id, error: r.error })
            } else {
              errors.push({ id: chunk[i].external_id, error: result.reason?.message || 'Processing failed' })
            }
          }
        }
        
        // Process in chunks of 3 for USGS (similar to GDACS)
        for (let i = 0; i < items.length; i += 3) {
          const chunk = items.slice(i, i + 3)
          await processChunk(chunk)
        }
        if (env.CACHE) {
          const keys = ['disasters:summary','disasters:current:all:all:all:50:0','disasters:history:7','countries:list']
          await Promise.all(keys.map((k) => env.CACHE!.delete(k).catch(() => {})))
        }
        if (errors.length) {
          return json({ success: false, error: { code: 'PARTIAL_FAIL', message: 'Some items failed', details: errors }, data: { processed: items.length, newDisasters, updatedDisasters } }, { status: 207 })
        }
        return json({ success: true, data: { processed: items.length, newDisasters, updatedDisasters } })
      } catch (err: any) {
        const message = err?.message || String(err)
        return json({ success: false, error: { code: 'INGEST_ERROR', message } }, { status: 500 })
      }
    }

    // Manual trigger to pull NOAA CAP alerts now
    if (req.method === 'POST' && pathname === '/ingest/noaa-cap') {
      try {
        const auth = req.headers.get('authorization') || ''
        const token = auth.replace(/^Bearer\s+/i, '')
        const expected = env.INGEST_SECRET ?? env.INGEST_TOKEN
        if (!expected || token !== expected) {
          return json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid token' } }, { status: 401 })
        }
        const rssUrl = env.NOAA_CAP_RSS_URL || 'https://alerts.weather.gov/cap/us.atom'
        const res = await fetch(rssUrl, { 
          headers: {
            'User-Agent': 'Flare360-DisasterMonitor/1.0 (+https://flare360.samuel-1e5.workers.dev)',
            'Accept': 'application/atom+xml, application/xml, text/xml, */*',
            'Accept-Encoding': 'gzip, deflate',
            'Cache-Control': 'no-cache'
          },
          cf: { cacheTtl: 300, cacheEverything: true } as any 
        })
        if (!res.ok) return json({ success: false, error: { code: 'UPSTREAM', message: `NOAA CAP fetch ${res.status}` } }, { status: 502 })
        const xml = await res.text()
        const items = parseNOAACAPFeed(xml).slice(0, 20) // Process more CAP alerts since they're lighter
        let newDisasters = 0
        let updatedDisasters = 0
        const errors: Array<{ id: string; error: string }> = []
        
        // Process items in parallel chunks
        const processChunk = async (chunk: any[]) => {
          const results = await Promise.allSettled(chunk.map(p => processParsedEmail(p, env)))
          for (let i = 0; i < results.length; i++) {
            const result = results[i]
            if (result.status === 'fulfilled') {
              const r = result.value
              newDisasters += r.newDisasters
              updatedDisasters += r.updatedDisasters
              if (r.error) errors.push({ id: chunk[i].external_id, error: r.error })
            } else {
              errors.push({ id: chunk[i].external_id, error: result.reason?.message || 'Processing failed' })
            }
          }
        }
        
        // Process in chunks of 5 for CAP alerts (they're lighter than earthquake data)
        for (let i = 0; i < items.length; i += 5) {
          const chunk = items.slice(i, i + 5)
          await processChunk(chunk)
        }
        if (env.CACHE) {
          const keys = ['disasters:summary','disasters:current:all:all:all:50:0','disasters:history:7','countries:list']
          await Promise.all(keys.map((k) => env.CACHE!.delete(k).catch(() => {})))
        }
        if (errors.length) {
          return json({ success: false, error: { code: 'PARTIAL_FAIL', message: 'Some items failed', details: errors }, data: { processed: items.length, newDisasters, updatedDisasters } }, { status: 207 })
        }
        return json({ success: true, data: { processed: items.length, newDisasters, updatedDisasters } })
      } catch (err: any) {
        const message = err?.message || String(err)
        return json({ success: false, error: { code: 'INGEST_ERROR', message } }, { status: 500 })
      }
    }

    // NASA FIRMS fire detection endpoint
    if (req.method === 'POST' && pathname === '/ingest/nasa-firms') {
      try {
        const auth = req.headers.get('authorization') || ''
        const token = auth.replace(/^Bearer\s+/i, '')
        const expected = env.INGEST_SECRET ?? env.INGEST_TOKEN
        if (!expected || token !== expected) {
          return json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid token' } }, { status: 401 })
        }
        
        const mapKey = env.NASA_FIRMS_MAP_KEY
        if (!mapKey) {
          return json({ success: false, error: { code: 'CONFIG_ERROR', message: 'NASA_FIRMS_MAP_KEY not configured' } }, { status: 500 })
        }
        
        console.log('Fetching NASA FIRMS fire detection data...')
        const items = await fetchFIRMSGlobalData(mapKey, 1) // Last 24 hours
        
        let newDisasters = 0
        let updatedDisasters = 0
        const errors: Array<{ id: string; error: string }> = []
        
        // Process items in parallel chunks (smaller chunks for fire data since there can be many)
        const processChunk = async (chunk: ParsedFIRMSItem[]) => {
          const results = await Promise.allSettled(chunk.map(p => processParsedEmail(p, env)))
          for (let i = 0; i < results.length; i++) {
            const result = results[i]
            if (result.status === 'fulfilled') {
              const r = result.value
              newDisasters += r.newDisasters
              updatedDisasters += r.updatedDisasters
              if (r.error) errors.push({ id: chunk[i].external_id, error: r.error })
            } else {
              errors.push({ id: chunk[i].external_id, error: result.reason?.message || 'Processing failed' })
            }
          }
        }
        
        // Process in smaller chunks of 3 for fire data (can be high volume)
        for (let i = 0; i < items.length; i += 3) {
          const chunk = items.slice(i, i + 3)
          await processChunk(chunk)
          
          // Add small delay between chunks to avoid overwhelming the database
          if (i + 3 < items.length) {
            await new Promise(resolve => setTimeout(resolve, 100))
          }
        }
        
        // Clear cache
        if (env.CACHE) {
          const keys = ['disasters:summary','disasters:current:all:all:all:50:0','disasters:history:7','countries:list']
          await Promise.all(keys.map((k) => env.CACHE!.delete(k).catch(() => {})))
        }
        
        if (errors.length) {
          return json({ success: false, error: { code: 'PARTIAL_FAIL', message: 'Some items failed', details: errors }, data: { processed: items.length, newDisasters, updatedDisasters } }, { status: 207 })
        }
        return json({ success: true, data: { processed: items.length, newDisasters, updatedDisasters } })
      } catch (err: any) {
        const message = err?.message || String(err)
        return json({ success: false, error: { code: 'INGEST_ERROR', message } }, { status: 500 })
      }
    }

    // Manual trigger: cyclone ingestion stub (Phase 1)
    if (req.method === 'POST' && pathname === '/ingest/cyclones') {
      try {
        const auth = req.headers.get('authorization') || ''
        const token = auth.replace(/^Bearer\s+/i, '')
        const expected = env.INGEST_SECRET ?? env.INGEST_TOKEN
        if (!expected || token !== expected) {
          return json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid token' } }, { status: 401 })
        }
        const t0 = Date.now()
        const result = await ingestCyclones(env as any, {})
        await updateFeedHealth(env as any, { feed_name: 'cyclones', ok: true, latency_ms: Date.now() - t0 })
        return json({ success: true, data: result })
      } catch (err: any) {
        await updateFeedHealth(env as any, { feed_name: 'cyclones', ok: false, error_message: err?.message })
        return json({ success: false, error: { code: 'INGEST_ERROR', message: err?.message || String(err) } }, { status: 500 })
      }
    }

    // Manual trigger: wildfire clusters recompute (Phase 1 stub)
    if (req.method === 'POST' && pathname === '/ingest/wildfire-clusters') {
      try {
        const auth = req.headers.get('authorization') || ''
        const token = auth.replace(/^Bearer\s+/i, '')
        const expected = env.INGEST_SECRET ?? env.INGEST_TOKEN
        if (!expected || token !== expected) {
          return json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid token' } }, { status: 401 })
        }
        const t0 = Date.now()
        const result = await computeWildfireClusters(env as any, {})
        await updateFeedHealth(env as any, { feed_name: 'wildfire_clusters', ok: true, latency_ms: Date.now() - t0 })
        return json({ success: true, data: result })
      } catch (err: any) {
        await updateFeedHealth(env as any, { feed_name: 'wildfire_clusters', ok: false, error_message: err?.message })
        return json({ success: false, error: { code: 'CLUSTER_ERROR', message: err?.message || String(err) } }, { status: 500 })
      }
    }

  if (req.method === 'POST' && pathname === '/ingest/email') {
      const auth = req.headers.get('authorization') || ''
      const token = auth.replace(/^Bearer\s+/i, '')
      const expected = env.INGEST_SECRET ?? env.INGEST_TOKEN
      if (!expected || token !== expected) {
        return json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid token' } }, { status: 401 })
      }
      let payload: any
      try {
        payload = await req.json()
      } catch {
        return json({ success: false, error: { code: 'BAD_REQUEST', message: 'Invalid JSON' } }, { status: 400 })
      }

      const subject = String(payload.subject || '')
      const body = String(payload.body || '')
      if (!subject && !body) {
        return json({ success: false, error: { code: 'BAD_REQUEST', message: 'Missing subject/body' } }, { status: 400 })
      }

      const start = Date.now()
      const parsedMany = parseEmailMulti(subject, body)
      let newDisasters = 0
      let updatedDisasters = 0
      for (const p of parsedMany) {
        const r = await processParsedEmail(p, env)
        newDisasters += r.newDisasters
        updatedDisasters += r.updatedDisasters
      }

      // Log processing
      await env.DB.prepare(`INSERT INTO processing_logs (email_date, disasters_processed, new_disasters, updated_disasters, status, processing_time_ms, email_size_bytes)
                            VALUES (?, ?, ?, ?, 'OK', ?, ?)`)
  .bind(new Date().toISOString().slice(0, 10), parsedMany.length, newDisasters, updatedDisasters, Date.now() - start, (subject.length + body.length))
        .run()

  return json({ success: true, data: { processed: parsedMany.length, newDisasters, updatedDisasters } })
    }

    // Health check endpoint
    if (req.method === 'GET' && pathname === '/health') {
      return json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } })
    }

  // Slightly more diagnostic 404 to help smoke-test debugging
  return json({ success: false, error: { code: 'NOT_FOUND', message: 'Not found', method: req.method, path: pathname } }, { status: 404 })
  },

  // Cloudflare Email Workers handler: runs when emails are routed to this worker
  async email(message: EmailMessage, env: Env, ctx: ExecutionContext) {
    try {
      // Optional allowlist for sender addresses (comma-separated)
      const allow = (env.ALLOW_FROM || '')
        .split(',')
        .map((s: string) => s.trim().toLowerCase())
        .filter(Boolean)
      if (allow.length && message.from && !allow.includes(message.from.toLowerCase())) {
        message.setReject?.('Address not allowed')
        return
      }

  // Decode RFC822 with postal-mime for robust MIME parsing
  const rawBuf = await new Response(message.raw).arrayBuffer()
  const parser = new PostalMime()
  const mail = await parser.parse(rawBuf)
  const subject = mail.subject || message.headers?.get('Subject') || ''
  const plain = mail.text || ''
  const html = mail.html || ''
  const body = plain || stripHtmlToPlain(html)
  const parsedMany = parseEmailMulti(subject, body)
      const t0 = Date.now()
      let newDisasters = 0
      let updatedDisasters = 0
      for (const p of parsedMany) {
        const r = await processParsedEmail(p, env)
        newDisasters += r.newDisasters
        updatedDisasters += r.updatedDisasters
      }

      // Log processing
      await env.DB.prepare(`INSERT INTO processing_logs (email_date, disasters_processed, new_disasters, updated_disasters, status, processing_time_ms, email_size_bytes)
                            VALUES (?, ?, ?, ?, 'OK', ?, ?)`)
  .bind(new Date().toISOString().slice(0, 10), parsedMany.length, newDisasters, updatedDisasters, Date.now() - t0, rawBuf.byteLength)
        .run()
    } catch (err) {
      // Minimal failure logging path
      try {
        await env.DB.prepare(`INSERT INTO processing_logs (email_date, disasters_processed, new_disasters, updated_disasters, status, processing_time_ms, email_size_bytes)
                              VALUES (?, 0, 0, 0, 'ERROR', 0, 0)`).bind(new Date().toISOString().slice(0, 10)).run()
      } catch {}
      console.error('Email processing failed:', err)
    }
  }
  ,
  // Scheduled cron to pull GDACS, ReliefWeb, USGS, NOAA CAP, and NASA FIRMS feeds periodically
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    try {
      const schedStart = Date.now()
      // Pull GDACS, ReliefWeb, USGS, and NOAA CAP feeds in parallel
      const gdacsUrl = env.GDACS_RSS_URL || 'https://www.gdacs.org/xml/rss.xml'
      const reliefUrl = env.RELIEFWEB_RSS_URL || 'https://reliefweb.int/disasters/rss.xml'  
      const usgsUrl = env.USGS_RSS_URL || 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_month.atom'
      const noaaCapUrl = env.NOAA_CAP_RSS_URL || 'https://alerts.weather.gov/cap/us.atom'
      const [gdacsRes, reliefRes, usgsRes, noaaCapRes] = await Promise.all([
        fetch(gdacsUrl, { cf: { cacheTtl: 300, cacheEverything: true } as any }),
        fetch(reliefUrl, { cf: { cacheTtl: 300, cacheEverything: true } as any }),
        fetch(usgsUrl, { cf: { cacheTtl: 300, cacheEverything: true } as any }),
        fetch(noaaCapUrl, { 
          headers: {
            'User-Agent': 'Flare360-DisasterMonitor/1.0 (+https://flare360.samuel-1e5.workers.dev)',
            'Accept': 'application/atom+xml, application/xml, text/xml, */*',
            'Accept-Encoding': 'gzip, deflate',
            'Cache-Control': 'no-cache'
          },
          cf: { cacheTtl: 300, cacheEverything: true } as any 
        }),
      ])
      if (gdacsRes.ok) {
        const xml = await gdacsRes.text()
        const items = parseGdacsFeed(xml)
        await Promise.all(items.map((p) => processParsedEmail(p as any, env)))
        await updateFeedHealth(env as any, { feed_name: 'gdacs', ok: true })
      } else {
        await updateFeedHealth(env as any, { feed_name: 'gdacs', ok: false, error_message: `HTTP ${gdacsRes.status}` })
      }
      if (reliefRes.ok) {
        const xml = await reliefRes.text()
        const items = parseReliefwebFeed(xml)
        await Promise.all(items.map((p) => processParsedEmail(p as any, env)))
        await updateFeedHealth(env as any, { feed_name: 'reliefweb', ok: true })
      } else {
        await updateFeedHealth(env as any, { feed_name: 'reliefweb', ok: false, error_message: `HTTP ${reliefRes.status}` })
      }
      if (usgsRes.ok) {
        const xml = await usgsRes.text()
        const items = parseUSGSFeed(xml)
        await Promise.all(items.map((p) => processParsedEmail(p as any, env)))
        await updateFeedHealth(env as any, { feed_name: 'usgs', ok: true })
      } else {
        await updateFeedHealth(env as any, { feed_name: 'usgs', ok: false, error_message: `HTTP ${usgsRes.status}` })
      }
      if (noaaCapRes.ok) {
        const xml = await noaaCapRes.text()
        const items = parseNOAACAPFeed(xml)
        await Promise.all(items.map((p) => processParsedEmail(p as any, env)))
        await updateFeedHealth(env as any, { feed_name: 'noaa_cap', ok: true })
      } else {
        await updateFeedHealth(env as any, { feed_name: 'noaa_cap', ok: false, error_message: `HTTP ${noaaCapRes.status}` })
      }
      
      // Fetch NASA FIRMS fire data if MAP_KEY is configured
      if (env.NASA_FIRMS_MAP_KEY) {
        try {
          const firmsItems = await fetchFIRMSGlobalData(env.NASA_FIRMS_MAP_KEY, 1)
          // Process in smaller batches to avoid overwhelming the database
          for (let i = 0; i < firmsItems.length; i += 5) {
            const batch = firmsItems.slice(i, i + 5)
            await Promise.all(batch.map((p) => processParsedEmail(p as any, env)))
            // Small delay between batches
            if (i + 5 < firmsItems.length) {
              await new Promise(resolve => setTimeout(resolve, 200))
            }
          }
          await updateFeedHealth(env as any, { feed_name: 'nasa_firms', ok: true })
        } catch (error) {
          console.error('Error processing NASA FIRMS data in scheduled job:', error)
          await updateFeedHealth(env as any, { feed_name: 'nasa_firms', ok: false, error_message: error?.message })
        }
      }

      // Invoke cyclone advisory ingestion stub (no-op currently)
      try {
        const t0 = Date.now()
        await ingestCyclones(env as any, {})
        await updateFeedHealth(env as any, { feed_name: 'cyclones', ok: true, latency_ms: Date.now() - t0 })
      } catch (err: any) {
        await updateFeedHealth(env as any, { feed_name: 'cyclones', ok: false, error_message: err?.message })
      }

      // Compute wildfire clusters stub
      try {
        const t0 = Date.now()
        await computeWildfireClusters(env as any, {})
        await updateFeedHealth(env as any, { feed_name: 'wildfire_clusters', ok: true, latency_ms: Date.now() - t0 })
      } catch (err: any) {
        await updateFeedHealth(env as any, { feed_name: 'wildfire_clusters', ok: false, error_message: err?.message })
      }
      
      // Purge old records (older than 24 hours) to prevent database growth
      try {
        const purgeResult = await purgeOldRecords(env)
        if (purgeResult.error) {
          console.error('Purge operation failed:', purgeResult.error)
        } else {
          console.log(`Purged ${purgeResult.purgedDisasters} disasters, ${purgeResult.purgedHistory} history records, ${purgeResult.purgedLogs} log entries`)
        }
      } catch (error) {
        console.error('Error during scheduled purge operation:', error)
      }
      
      if (env.CACHE) {
        const keys = ['disasters:summary','disasters:current:all:all:all:50:0','disasters:history:7','countries:list']
        await Promise.all(keys.map((k) => env.CACHE!.delete(k).catch(() => {})))
      }
    } catch {}
  }
}

function stripHtmlToPlain(html: string): string {
  // naive fallback: remove tags, decode basic entities, collapse whitespace
  const noTags = html.replace(/<\s*br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ' ')
  const entities = noTags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
  return entities.replace(/[\t\x0B\f\r]+/g, ' ').replace(/\n\s*\n\s*/g, '\n\n').trim()
}
