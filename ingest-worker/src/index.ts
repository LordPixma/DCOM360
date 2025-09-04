import { parseEmail, parseEmailMulti, type ParsedEmail } from './parser'

interface Env {
  DB: D1Database
  CACHE?: KVNamespace
  INGEST_TOKEN?: string
  INGEST_SECRET?: string
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

async function processParsedEmail(parsed: ParsedEmail, env: Env) {
  const existing = await env.DB.prepare('SELECT id, severity FROM disasters WHERE external_id = ?').bind(parsed.external_id).first<{ id: number; severity: string }>()

  let newDisasters = 0
  let updatedDisasters = 0
  if (!existing) {
    await env.DB.prepare(`INSERT INTO disasters (external_id, disaster_type, severity, title, country, coordinates_lat, coordinates_lng, event_timestamp, description)
                          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(parsed.external_id, parsed.disaster_type, parsed.severity, parsed.title, parsed.country || null, parsed.coordinates_lat ?? null, parsed.coordinates_lng ?? null, parsed.event_timestamp, parsed.description || null)
      .run()
    newDisasters = 1
  } else {
    await env.DB.prepare(`UPDATE disasters SET disaster_type = ?, severity = ?, title = ?, country = ?, coordinates_lat = ?, coordinates_lng = ?, event_timestamp = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE external_id = ?`)
      .bind(parsed.disaster_type, parsed.severity, parsed.title, parsed.country || null, parsed.coordinates_lat ?? null, parsed.coordinates_lng ?? null, parsed.event_timestamp, parsed.description || null, parsed.external_id)
      .run()
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
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'POST,OPTIONS', 'access-control-allow-headers': 'content-type,authorization' } })
    }

    if (req.method === 'POST' && url.pathname === '/ingest/email') {
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
  const parsed = parseEmail(subject, body)
  const { newDisasters, updatedDisasters } = await processParsedEmail(parsed, env)

      // Log processing
      await env.DB.prepare(`INSERT INTO processing_logs (email_date, disasters_processed, new_disasters, updated_disasters, status, processing_time_ms, email_size_bytes)
                            VALUES (?, ?, ?, ?, 'OK', ?, ?)`)
        .bind(new Date().toISOString().slice(0, 10), 1, newDisasters, updatedDisasters, Date.now() - start, (subject.length + body.length))
        .run()

      return json({ success: true, data: { processed: 1, newDisasters, updatedDisasters } })
    }

    return new Response('Not found', { status: 404 })
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

      // Decode RFC822 and split headers/body
      const rawBuf = await new Response(message.raw).arrayBuffer()
      const text = new TextDecoder('utf-8').decode(rawBuf)
      const parts = text.split(/\r?\n\r?\n/)
      const headers = parts[0] || ''
      const body = parts.slice(1).join('\n\n') || text
      const hSubject = (/^Subject:\s*(.+)$/gim.exec(headers)?.[1] || '').trim()
      const subject = message.headers?.get('Subject') || message.headers?.get('subject') || hSubject
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
}
