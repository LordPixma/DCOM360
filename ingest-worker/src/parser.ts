export type ParsedEmail = {
  external_id: string
  disaster_type: string
  severity: 'RED' | 'ORANGE' | 'GREEN'
  title: string
  country?: string
  coordinates_lat?: number
  coordinates_lng?: number
  event_timestamp: string
  description?: string
  metadata?: Record<string, unknown>
}

// Very lightweight parser that expects simple GDACS-like lines.
// This can be expanded to robust MIME parsing or HTML when needed.
export function parseEmail(subject: string, body: string): ParsedEmail {
  const text = `${subject}\n${body}`
  const get = (re: RegExp) => text.match(re)?.[1]?.trim()

  const id = get(/ID:\s*(.+)/i) || (globalThis as any).crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`
  const type = (get(/Type:\s*(.+)/i) || 'unknown').toLowerCase()
  const sevText = (get(/Severity:\s*(.+)/i) || 'GREEN').toUpperCase()
  const severity = (sevText.includes('RED') ? 'RED' : sevText.includes('ORANGE') || sevText.includes('YELLOW') ? 'ORANGE' : 'GREEN') as ParsedEmail['severity']
  const title = get(/Title:\s*(.+)/i) || subject || `${type} event`
  const country = get(/Country:\s*([A-Z]{2})/i)
  const lat = parseFloat(get(/Lat:\s*([-+]?\d+\.\d+)/i) || '')
  const lng = parseFloat(get(/Lng:\s*([-+]?\d+\.\d+)/i) || '')
  const ts = get(/Date:\s*([^\n]+)/i) || new Date().toISOString()
  const description = get(/Description:\s*([\s\S]+)/i)

  return {
    external_id: id,
    disaster_type: type,
    severity,
    title,
    country: country?.toUpperCase(),
    coordinates_lat: isFinite(lat) ? lat : undefined,
    coordinates_lng: isFinite(lng) ? lng : undefined,
    event_timestamp: new Date(ts).toISOString(),
    description: description?.slice(0, 2000),
  }
}
