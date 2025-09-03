export interface APIResponse<T> {
  success: boolean
  data: T
  error?: { code: string; message: string }
  meta?: Record<string, unknown>
}

type Disaster = {
  id: string
  type: string
  severity: 'green'|'yellow'|'red'
  country?: string
  latitude?: number
  longitude?: number
  title: string
  occurred_at: string
}

function json<T>(data: T, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { 'content-type': 'application/json; charset=utf-8', ...(init.headers || {}) }
  })
}

const mockDisasters: Disaster[] = [
  { id: '1', type: 'flood', severity: 'yellow', country: 'NG', latitude: 9.08, longitude: 8.68, title: 'Flood in Plateau', occurred_at: new Date().toISOString() },
  { id: '2', type: 'earthquake', severity: 'red', country: 'TR', latitude: 39.92, longitude: 32.85, title: 'Earthquake near Ankara', occurred_at: new Date().toISOString() },
  { id: '3', type: 'wildfire', severity: 'green', country: 'US', latitude: 34.05, longitude: -118.24, title: 'Small wildfire in LA', occurred_at: new Date().toISOString() },
]

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname === '/api/disasters/current' && request.method === 'GET') {
      const type = url.searchParams.get('type') || undefined
      const severity = url.searchParams.get('severity') || undefined
      const country = url.searchParams.get('country') || undefined
      let items = mockDisasters
      if (type) items = items.filter(d => d.type === type)
      if (severity) items = items.filter(d => d.severity === severity)
      if (country) items = items.filter(d => d.country === country)
      const body: APIResponse<Disaster[]> = { success: true, data: items }
      return json(body)
    }
    if (url.pathname === '/api/disasters/summary' && request.method === 'GET') {
      const counts: Record<string, number> = {}
      for (const d of mockDisasters) counts[d.type] = (counts[d.type] || 0) + 1
      const totals = Object.entries(counts).map(([type, count]) => ({ type, count }))
      const body: APIResponse<{ totals: { type: string; count: number }[] }> = { success: true, data: { totals } }
      return json(body)
    }
    return new Response('Not found', { status: 404 })
  }
}
