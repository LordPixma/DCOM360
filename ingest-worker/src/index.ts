import { parseEmail, parseEmailMulti, type ParsedEmail } from './parser'
import { parseGdacsFeed } from './gdacs'
import PostalMime from 'postal-mime'

interface Env {
  DB: D1Database
  CACHE?: KVNamespace
  INGEST_TOKEN?: string
  INGEST_SECRET?: string
  ALLOW_FROM?: string
  GDACS_RSS_URL?: string
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

async function processParsedEmail(parsed: ParsedEmail, env: Env) {
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
      // Minimal columns on legacy schema
      await env.DB.prepare(`INSERT INTO disasters (id, disaster_type, severity, title, country, coordinates_lat, coordinates_lng, event_timestamp, is_active)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`).
        bind(parsed.external_id, parsed.disaster_type, parsed.severity, parsed.title, parsed.country || null, parsed.coordinates_lat ?? null, parsed.coordinates_lng ?? null, parsed.event_timestamp).
        run()
    } else {
      await env.DB.prepare(`INSERT INTO disasters (external_id, disaster_type, severity, title, country, coordinates_lat, coordinates_lng, event_timestamp, description)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(parsed.external_id, parsed.disaster_type, parsed.severity, parsed.title, parsed.country || null, parsed.coordinates_lat ?? null, parsed.coordinates_lng ?? null, parsed.event_timestamp, parsed.description || null)
        .run()
    }
    newDisasters = 1
  } else {
    if (useLegacy) {
      await env.DB.prepare(`UPDATE disasters SET disaster_type = ?, severity = ?, title = ?, country = ?, coordinates_lat = ?, coordinates_lng = ?, event_timestamp = ? WHERE id = ?`)
        .bind(parsed.disaster_type, parsed.severity, parsed.title, parsed.country || null, parsed.coordinates_lat ?? null, parsed.coordinates_lng ?? null, parsed.event_timestamp, parsed.external_id)
        .run()
    } else {
      await env.DB.prepare(`UPDATE disasters SET disaster_type = ?, severity = ?, title = ?, country = ?, coordinates_lat = ?, coordinates_lng = ?, event_timestamp = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE external_id = ?`)
        .bind(parsed.disaster_type, parsed.severity, parsed.title, parsed.country || null, parsed.coordinates_lat ?? null, parsed.coordinates_lng ?? null, parsed.event_timestamp, parsed.description || null, parsed.external_id)
        .run()
    }
    if (existing.severity !== parsed.severity) {
      await env.DB.prepare(`INSERT INTO disaster_history (disaster_id, severity_old, severity_new, change_reason)
                            VALUES (?, ?, ?, ?)`)
        .bind(existing.id, existing.severity, parsed.severity, 'email_update')
        .run()
    }
    updatedDisasters = 1
  }

  // Invalidate cache keys
  if (env.CACHE) {
    const keys = [
      'disasters:summary',
      'disasters:current:all:all:all:50:0',
      'disasters:history:7',
      'countries:list',
    ]
    await Promise.all(keys.map((k) => env.CACHE!.delete(k).catch(() => {})))
  }

  return { newDisasters, updatedDisasters }
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
        const items = parseGdacsFeed(xml)
        let newDisasters = 0
        let updatedDisasters = 0
        for (const p of items) {
          const r = await processParsedEmail(p as any, env)
          newDisasters += r.newDisasters
          updatedDisasters += r.updatedDisasters
        }
        if (env.CACHE) {
          const keys = ['disasters:summary','disasters:current:all:all:all:50:0','disasters:history:7','countries:list']
          await Promise.all(keys.map((k) => env.CACHE!.delete(k).catch(() => {})))
        }
        return json({ success: true, data: { processed: items.length, newDisasters, updatedDisasters } })
      } catch (err: any) {
        const message = err?.message || String(err)
        return json({ success: false, error: { code: 'INGEST_ERROR', message } }, { status: 500 })
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

  // Slightly more diagnostic 404 to help smoke-test debugging
  return json({ success: false, error: { code: 'NOT_FOUND', message: 'Not found', method: req.method, path: pathname } }, { status: 404 })
  },

  // Cloudflare Email Workers handler: runs when emails are routed to this worker
  async email(message: EmailMessage, env: Env, ctx: ExecutionContext) {
    try {
      // Optional allowlist for sender addresses (comma-separated)
      const allow = (env.ALLOW_FROM || '')
        .split(',')
        .map((s) => s.trim().toLowerCase())
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
  // Scheduled cron to pull GDACS periodically
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    const rssUrl = env.GDACS_RSS_URL || 'https://www.gdacs.org/xml/rss.xml'
    try {
      const res = await fetch(rssUrl, { cf: { cacheTtl: 300, cacheEverything: true } as any })
      if (!res.ok) return
      const xml = await res.text()
      const items = parseGdacsFeed(xml)
      await Promise.all(items.map(async (p) => processParsedEmail(p as any, env)))
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
