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

// Parse GDACS daily newsletter that lists multiple events (earthquakes, tropical cyclones) in sections by severity.
export function parseEmailMulti(subject: string, body: string): ParsedEmail[] {
  const text = `${subject}\n${body}`
  const results: ParsedEmail[] = []

  // Quick heuristic to detect newsletter
  const isNewsletter = /Global Disaster Alert and Coordination System/i.test(text) && /Disaster events in the last 24 hours/i.test(text)
  if (!isNewsletter) {
    return [parseEmail(subject, body)]
  }

  const norm = body.replace(/\r\n/g, '\n')
  const sevMap = (s: string): ParsedEmail['severity'] => (s.toUpperCase().startsWith('RED') ? 'RED' : s.toUpperCase().startsWith('ORANGE') ? 'ORANGE' : 'GREEN')

  // Earthquakes pattern example:
  // "Green earthquake alert (Magnitude 4.5M, Depth:59.47km) in Russian Federation 04/09/2025 06:34 UTC, Few people affected in 100km."
  const eqRe = /\b(Green|Orange|Red)\s+earthquake\s+alert\s*\(Magnitude\s*([\d.]+)M,\s*Depth:([\d.]+)km\)\s+in\s+([^\n]+?)\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+(\d{1,2}:\d{2})\s*UTC/gi
  let m: RegExpExecArray | null
  while ((m = eqRe.exec(norm))) {
    const sev = sevMap(m[1])
    const mag = m[2]
    const depthKm = m[3]
    const countryRaw = m[4].trim().replace(/[.,]$/, '')
    const dateStr = m[5]
    const timeStr = m[6]
    const iso = toIsoFromEuropean(dateStr, timeStr)
    const country = sanitizeCountry(countryRaw)

    const title = `${capitalize(sev.toLowerCase())} earthquake M${mag} ${country ? 'in ' + country : ''}`.trim()
    const external_id = `gdacs:earthquake:${country || 'unknown'}:${iso}:${mag}:${depthKm}`

    results.push({
      external_id,
      disaster_type: 'earthquake',
      severity: sev,
      title,
      country: country || undefined,
      event_timestamp: iso,
      description: `Magnitude ${mag} at depth ${depthKm}km`,
      metadata: { magnitude: parseFloat(mag), depth_km: parseFloat(depthKm) }
    })
  }

  // Tropical cyclone pattern header line:
  // "Green alert for tropical cyclone PEIPAH-25. Population affected by Category 1 ..."
  const tcRe = /\b(Green|Orange|Red)\s+alert\s+for\s+tropical\s+cyclone\s+([A-Z0-9\-\.]+)\./gi
  while ((m = tcRe.exec(norm))) {
    const sev = sevMap(m[1])
    const name = m[2]
    // Look ahead within next few lines for date range and countries line
    const tail = norm.slice(tcRe.lastIndex, tcRe.lastIndex + 800)
    const range = /From\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+to\s+(\d{1,2}\/\d{1,2}\/\d{4})/i.exec(tail)
    const endIso = range ? toIsoFromEuropean(range[2], '00:00') : new Date().toISOString()
    const countriesMatch = /The cyclone affects these countries:\s*([^\.\n]+)/i.exec(tail)
    const firstCountry = countriesMatch ? countriesMatch[1].split(',')[0].trim() : undefined
  const country = firstCountry ? sanitizeCountry(firstCountry.replace(/\(.*?\)/, '').trim()) : undefined

    const title = `${capitalize(sev.toLowerCase())} tropical cyclone ${name}`
    const external_id = `gdacs:cyclone:${name}:${endIso}`
    results.push({
      external_id,
      disaster_type: 'tropical_cyclone',
      severity: sev,
      title,
  country: country || undefined,
      event_timestamp: endIso,
      description: `GDACS tropical cyclone ${name}`,
      metadata: { name }
    })
  }

  // If nothing matched, fall back to single-event parsing
  return results.length ? results : [parseEmail(subject, body)]
}

function toIsoFromEuropean(dateDDMMYYYY: string, timeHHMM: string): string {
  // Accepts dd/mm/yyyy or d/m/yyyy
  const [d, m, y] = dateDDMMYYYY.split('/').map((s) => parseInt(s, 10))
  const [hh, mm] = timeHHMM.split(':').map((s) => parseInt(s, 10))
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${y}-${pad(m)}-${pad(d)}T${pad(hh)}:${pad(mm)}:00.000Z`
}

function sanitizeCountry(raw: string): string | null {
  const c = raw.replace(/\[unknown\]/i, '').replace(/\s{2,}/g, ' ').trim()
  if (!c || /unknown/i.test(raw)) return null
  return c
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
