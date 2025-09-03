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
