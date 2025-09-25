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
  affected_population?: number
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

function extractAffectedPopulation(text: string): number | undefined {
  if (!text) return undefined
  
  // Look for population numbers near relevant keywords
  const patterns = [
    // Direct patterns: "affected: 500,000 people", "population affected: 1.2 million"
    /(?:affected.*?population|population.*?affected).*?:?\s*(\d{1,3}(?:,\d{3})*|\d+(?:\.\d+)?)\s*(million|mln|k|thousand)/i,
    /(\d{1,3}(?:,\d{3})*|\d+(?:\.\d+)?)\s*(million|mln|k|thousand)?\s*(?:people\s+)?(?:affected|displaced|evacuated)/i,
    
    // XML field patterns that might exist in GDACS
    /(?:gdacs:)?(?:population|affected).*?(\d{1,3}(?:,\d{3})*|\d+)/i,
    
    // General number patterns near population keywords
    /(\d{1,3}(?:,\d{3})*)\s*(?:people|persons|individuals)?\s*(?:affected|displaced|evacuated|at risk)/i,
  ]
  
  for (const pattern of patterns) {
    const match = pattern.exec(text)
    if (match) {
      const numStr = match[1].replace(/,/g, '')
      let num = parseFloat(numStr)
      
      if (!isFinite(num)) continue
      
      const multiplier = (match[2] || '').toLowerCase()
      if (multiplier === 'million' || multiplier === 'mln') {
        num *= 1_000_000
      } else if (multiplier === 'k' || multiplier === 'thousand') {
        num *= 1_000
      }
      
      // Sanity check: reasonable population numbers
      if (num >= 10 && num <= 100_000_000) {
        return Math.round(num)
      }
    }
  }
  
  return undefined
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

    // Extract affected population from title, description, and specific GDACS fields
    const fullText = `${title} ${description || ''} ${it['gdacs:population'] || ''} ${it['gdacs:totdeath'] || ''} ${it['gdacs:totpop'] || ''}`
    const affected_population = extractAffectedPopulation(fullText)

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
      affected_population,
    })
  }
  return result
}
