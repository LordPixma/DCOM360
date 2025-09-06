import { XMLParser } from 'fast-xml-parser'
import { resolveCountryIso2 } from './parser'

export type ParsedReliefWebItem = {
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

function inferTypeFromText(text: string): string {
  const t = text.toLowerCase()
  if (/earthquake/.test(t)) return 'earthquake'
  if (/flood|flooding/.test(t)) return 'flood'
  if (/cyclone|typhoon|hurricane|tropical\s+storm/.test(t)) return 'cyclone'
  if (/wild\s*fire|wildfire|forest\s*fire/.test(t)) return 'wildfire'
  if (/landslide|mudslide|debris\s+flow|slope\s+failure/.test(t)) return 'landslide'
  if (/drought|water\s+scarcity|dry\s+spell/.test(t)) return 'drought'
  return 'other'
}

function extractCategories(it: any): string[] {
  const cats = it?.category
  if (!cats) return []
  if (Array.isArray(cats)) {
    return cats
      .map((c) => {
        if (typeof c === 'string') return c
        if (c && typeof c === 'object') {
          return (c as any)['#text'] || (c as any).text || ''
        }
        return ''
      })
      .filter((s) => !!s)
  }
  if (typeof cats === 'string') return [cats]
  if (cats && typeof cats === 'object') return [((cats as any)['#text'] || (cats as any).text || '')].filter(Boolean)
  return []
}

function extractCountryFromCategories(categories: string[]): string | undefined {
  // ReliefWeb categories may include country names; pick the first that looks like a proper name
  for (const c of categories) {
    const s = String(c).trim()
    if (!s) continue
    // Simple heuristic: ignore generic tags like Disaster, Update, Floods if too generic
    if (/^(disaster|update|report|appeal|floods?|earthquakes?|cyclones?|typhoons?)$/i.test(s)) continue
    // Prefer words with spaces (country names) or capitalized words
    if (/^[A-Z][A-Za-z\s\-\(\)']+$/.test(s)) {
      return s
    }
  }
  return undefined
}

function parseMagnitude(text: string): number | undefined {
  const m = /(m(?:agnitude)?\s*([\d.]+)|\b([\d.]+)\s*m)\b/i.exec(text)
  const val = m ? parseFloat(m[2] || m[3]) : NaN
  return isFinite(val) ? val : undefined
}

function parseCycloneCategory(text: string): number | undefined {
  const m = /\bcat(?:egory)?\s*([1-5])\b/i.exec(text)
  return m ? parseInt(m[1], 10) : undefined
}

function parseNumberNearKeywords(text: string, keywords: RegExp): number | undefined {
  // Find patterns like 12,345 or 12k near the keywords window
  const window = 120
  const matches: number[] = []
  for (const kw of text.matchAll(keywords)) {
    const idx = kw.index ?? 0
    const slice = text.slice(Math.max(0, idx - window), Math.min(text.length, idx + window))
    const nums = slice.match(/\b(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)(?:\s*(k|K|m|M))?\b|\b(\d+(?:\.\d+)?)\s*(million|mln)\b/g)
    if (nums) {
      for (const n of nums) {
        const millionWord = /(million|mln)/i.exec(n)
        if (millionWord) {
          const num = parseFloat(n.replace(/[^\d.]/g, ''))
          if (isFinite(num)) matches.push(num * 1_000_000)
          continue
        }
        const suffix = /(k|K|m|M)$/.exec(n)?.[1]
        const raw = n.replace(/,/g, '').replace(/(k|K|m|M)$/i, '')
        const val = parseFloat(raw)
        if (!isFinite(val)) continue
        if (!suffix) matches.push(val)
        else if (suffix.toLowerCase() === 'k') matches.push(val * 1_000)
        else if (suffix.toLowerCase() === 'm') matches.push(val * 1_000_000)
      }
    }
  }
  if (!matches.length) return undefined
  return Math.max(...matches)
}

function inferSeverityFromText(text: string, disasterType: string): 'GREEN'|'ORANGE'|'RED' {
  const t = text.toLowerCase()
  // Strong keywords
  const redWords = /(catastrophic|devastating|massive\s+destruction|widespread\s+destruction|disaster\s+declared)/i
  const orangeWords = /(major|severe|state of emergency|evacuation|evacuations|flash\s+flood|emergency\s+declared)/i

  // Numeric signals
  const mag = parseMagnitude(text)
  const cat = parseCycloneCategory(text)
  const deaths = parseNumberNearKeywords(text, /(death|deaths|killed|fatalities)/gi)
  const affected = parseNumberNearKeywords(text, /(affected|displaced|evacuated)/gi)

  // Type-specific numeric thresholds (tuned for ReliefWeb content density)
  if (disasterType === 'earthquake' && mag !== undefined) {
    if (mag >= 6.8) return 'RED'
    if (mag >= 5.8) return 'ORANGE'
  }
  if (disasterType === 'cyclone' && cat !== undefined) {
    if (cat >= 3) return 'RED'
    if (cat >= 1) return 'ORANGE'
  }
  if (disasterType === 'landslide') {
    if (deaths !== undefined && deaths >= 10) return 'RED'
    if (affected !== undefined && affected >= 5_000) return 'ORANGE'
    if (/major\s+landslide|villages?\s+buried|homes?\s+buried/i.test(text)) return 'ORANGE'
  }
  if (disasterType === 'drought') {
    // Drought often reported with large affected numbers; use higher thresholds
    if (affected !== undefined && affected >= 500_000) return 'RED'
    if (affected !== undefined && affected >= 100_000) return 'ORANGE'
    if (/severe\s+drought|prolonged\s+drought|acute\s+food\s+insecurity/i.test(text)) return 'ORANGE'
  }

  // Casualties / affected thresholds (generic)
  if (deaths !== undefined) {
    if (deaths >= 25) return 'RED'
    if (deaths >= 5) return 'ORANGE'
  }
  if (affected !== undefined) {
    if (affected >= 250_000) return 'RED'
    if (affected >= 25_000) return 'ORANGE'
  }

  // Keyword-based fallback
  if (redWords.test(text)) return 'RED'
  if (orangeWords.test(text)) return 'ORANGE'

  // Wildfire extra: "out of control" -> ORANGE
  if (disasterType === 'wildfire' && /out of control/i.test(text)) return 'ORANGE'

  return 'GREEN'
}

export function parseReliefwebFeed(xml: string): ParsedReliefWebItem[] {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' })
  const doc = parser.parse(xml)
  const items = doc?.rss?.channel?.item
  if (!items) return []
  const list = Array.isArray(items) ? items : [items]
  const result: ParsedReliefWebItem[] = []
  for (const it of list) {
    const guid = String(it.guid?.['#text'] || it.guid || it.link || it.title || '')
    if (!guid) continue
    const ext = `reliefweb:${guid}`
    const title: string = String(it.title || '')
    const description: string = it.description ? String(it.description) : ''
    const pub = it.pubDate ? new Date(it.pubDate) : new Date()
    const when = isNaN(pub.getTime()) ? new Date() : pub
    const categories = extractCategories(it)
  const countryName = extractCountryFromCategories(categories)?.replace(/\(.*?\)/g, '').trim()

  const disaster_type = inferTypeFromText(`${title} ${description} ${categories.join(' ')}`)
  const severity: ParsedReliefWebItem['severity'] = inferSeverityFromText(`${title} ${description} ${categories.join(' ')}`, disaster_type)

    result.push({
      external_id: ext,
      disaster_type,
      severity,
      title,
      country: (countryName && resolveCountryIso2(countryName)) || undefined,
      event_timestamp: when.toISOString(),
      description,
    })
  }
  return result
}
