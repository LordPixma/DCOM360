import { XMLParser } from 'fast-xml-parser'
import { resolveCountryIso2 } from './parser'

export type ParsedVDItem = {
  external_id: string
  disaster_type: string
  severity: 'GREEN' | 'ORANGE' | 'RED'
  title: string
  country?: string
  coordinates_lat?: number
  coordinates_lng?: number
  event_timestamp: string
  description?: string
}

// Map VolcanoDiscovery item to GDACS-like categories where possible.
// We'll classify:
// - Earthquake reports => 'earthquake'
// - Volcano eruption/ash alert => 'other' (GDACS doesn't have 'volcano'); keep 'other' for now.
// - Tsunami alerts, floods, cyclones are unlikely here, default to 'other'.
function inferTypeFromVD(title: string, description?: string): string {
  const text = `${title} ${description || ''}`.toLowerCase()
  if (/earthquake|quake\b|m\s*\d+(?:\.\d+)?\s*/.test(text)) return 'earthquake'
  if (/eruption|volcano|ash plume|lava|strombolian|vulcanian|plinian/.test(text)) return 'other'
  return 'other'
}

// Heuristic severity mapping: use magnitude for earthquakes; otherwise default ORANGE for eruption notices, GREEN for general news.
function inferSeverity(title: string, description?: string): 'GREEN' | 'ORANGE' | 'RED' {
  const text = `${title} ${description || ''}`.toLowerCase()
  const mag = /m\s*(\d+(?:\.\d+)?)/i.exec(text)
  if (mag) {
    const m = parseFloat(mag[1])
    if (m >= 6.5) return 'RED'
    if (m >= 5.0) return 'ORANGE'
    return 'GREEN'
  }
  if (/eruption|significant ash|strong explosion|major/.test(text)) return 'ORANGE'
  return 'GREEN'
}

export function parseVolcanoDiscoveryFeed(xml: string): ParsedVDItem[] {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' })
  const doc = parser.parse(xml)
  const items = doc?.rss?.channel?.item
  if (!items) return []
  const list = Array.isArray(items) ? items : [items]
  const out: ParsedVDItem[] = []
  for (const it of list) {
    const guid = String(it.guid?.['#text'] || it.guid || it.link || it.title || '')
    const title = String(it.title || '')
    const description: string | undefined = it.description ? String(it.description) : undefined
    const pubDate = it.pubDate ? new Date(it.pubDate) : new Date()
    const when = isNaN(pubDate.getTime()) ? new Date() : pubDate

    // Country extraction heuristic: often appears like "Volcano/Place (Country)" or in description.
    let countryIso: string | undefined
    const countryMatch = /\(([^)]+)\)\s*$/.exec(title) || /\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\b(?:\s*\)|\.|,)?\s*$/.exec(title)
    if (countryMatch) {
      const cName = countryMatch[1].trim()
      countryIso = resolveCountryIso2(cName)
    } else if (description) {
      const m = /\b(in|at)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\b/.exec(description)
      if (m) countryIso = resolveCountryIso2(m[2])
    }

    // Lat/Lng sometimes appear in geo tags or text; VolcanoDiscovery RSS usually lacks georss.
    let lat: number | undefined
    let lng: number | undefined
    if (it['geo:lat'] && it['geo:long']) {
      const la = Number(it['geo:lat'])
      const lo = Number(it['geo:long'])
      if (isFinite(la)) lat = la
      if (isFinite(lo)) lng = lo
    }

    const type = inferTypeFromVD(title, description)
    const severity = inferSeverity(title, description)
    const external_id = `vd:${guid || title.slice(0, 80)}`

    out.push({
      external_id,
      disaster_type: type,
      severity,
      title,
      country: countryIso,
      coordinates_lat: lat,
      coordinates_lng: lng,
      event_timestamp: when.toISOString(),
      description,
    })
  }
  return out
}
