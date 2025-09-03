export function json<T>(data: T, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...(init.headers || {})
    }
  })
}

export function mapSeverityToClient(db: 'RED'|'ORANGE'|'GREEN'): 'red'|'yellow'|'green' {
  if (db === 'RED') return 'red'
  if (db === 'ORANGE') return 'yellow'
  return 'green'
}

export function buildCorsHeaders(env: { ENV_ORIGIN?: string }, req: Request): Record<string, string> {
  const cfg = (env.ENV_ORIGIN || '*').split(',').map(s => s.trim()).filter(Boolean)
  if (cfg.includes('*')) return { 'access-control-allow-origin': '*' }
  const reqOrigin = req.headers.get('origin') || ''
  if (reqOrigin && cfg.includes(reqOrigin)) {
    return { 'access-control-allow-origin': reqOrigin }
  }
  // If misconfigured, be conservative: omit ACAO (browser will block)
  return {}
}
