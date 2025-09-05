import { XMLParser } from 'fast-xml-parser'

export type ParsedGdacsItem = {
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

function mapAlertLevel(level?: string): 'GREEN' | 'ORANGE' | 'RED' {
  const v = (level || '').toLowerCase()
  if (v === 'red') return 'RED'
  if (v === 'orange') return 'ORANGE'
  return 'GREEN'
}

function inferType(title: string): string {
  const t = title.toLowerCase()
  if (t.includes('earthquake')) return 'earthquake'
  if (t.includes('flood')) return 'flood'
  if (t.includes('cyclone') || t.includes('tropical cyclone') || t.includes('typhoon') || t.includes('hurricane')) return 'cyclone'
  if (t.includes('wildfire') || t.includes('fire')) return 'wildfire'
  return 'other'
}

export function parseGdacsFeed(xml: string): ParsedGdacsItem[] {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' })
  const doc = parser.parse(xml)
  const items = doc?.rss?.channel?.item
  if (!items) return []
  const list = Array.isArray(items) ? items : [items]
  const result: ParsedGdacsItem[] = []
  for (const it of list) {
    const eventId = String(it['gdacs:eventid'] || it.guid || it.link || it.title || '')
    if (!eventId) continue
    const ext = `gdacs:${eventId}`
    const title: string = String(it.title || '')
    const alert = String(it['gdacs:alertlevel'] || '')
    const severity = mapAlertLevel(alert)
    const t = inferType(title)
    const pub = it.pubDate ? new Date(it.pubDate) : new Date()
    const when = isNaN(pub.getTime()) ? new Date() : pub
    const country = it['gdacs:country'] ? String(it['gdacs:country']) : undefined
    const geopt = it['georss:point'] ? String(it['georss:point']) : ''
    let lat: number | undefined
    let lng: number | undefined
    if (geopt) {
      const [latStr, lngStr] = geopt.trim().split(/\s+/)
      lat = Number(latStr)
      lng = Number(lngStr)
      if (!isFinite(lat)) lat = undefined
      if (!isFinite(lng)) lng = undefined
    }
    const description: string | undefined = it.description ? String(it.description) : undefined

    result.push({
      external_id: ext,
      disaster_type: t,
      severity,
      title,
      country,
      coordinates_lat: lat,
      coordinates_lng: lng,
      event_timestamp: when.toISOString(),
      description,
    })
  }
  return result
}
