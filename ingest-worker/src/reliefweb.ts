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
  affected_population?: number
}

function inferTypeFromText(text: string): string {
  const t = text.toLowerCase()
  
  // Primary disaster types
  if (/earthquake|quake/i.test(text)) return 'earthquake'
  if (/flood|flooding|flash\s+flood/i.test(text)) return 'flood'
  if (/cyclone|typhoon|hurricane|tropical\s+storm|tc[-_\s]?\d/i.test(text)) return 'cyclone'
  if (/wild\s*fire|wildfire|forest\s*fire/i.test(text)) return 'wildfire'
  if (/landslide|mudslide|debris\s+flow|slope\s+failure/i.test(text)) return 'landslide'
  if (/drought|water\s+scarcity|dry\s+spell/i.test(text)) return 'drought'
  
  // Extended disaster types from ReliefWeb
  if (/volcano|volcanic|eruption/i.test(text)) return 'volcano'
  if (/heat\s+wave|extreme\s+heat|temperature/i.test(text)) return 'heatwave'
  
  // Disease outbreaks and epidemics
  if (/cholera|ebola|diphtheria|outbreak|epidemic|disease/i.test(text)) return 'epidemic'
  
  // Return 'other' for unclassified disasters
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

function extractCountryFromDescription(description: string): string | undefined {
  // Extract from HTML tags like: <div class="tag country">Affected country: Democratic Republic of the Congo</div>
  const countryMatch = description.match(/<div class="tag country">Affected country:\s*([^<]+)<\/div>/i)
  if (countryMatch) {
    return countryMatch[1].trim()
  }
  return undefined
}

function extractGlideNumber(description: string, categories: string[]): string | undefined {
  // Extract GLIDE number from description like: <div class="tag glide">Glide: EP-2025-000157-COD</div>
  const glideMatch = description.match(/<div class="tag glide">Glide:\s*([^<]+)<\/div>/i)
  if (glideMatch) {
    return glideMatch[1].trim()
  }
  
  // Also check categories for GLIDE numbers
  for (const cat of categories) {
    if (/^[A-Z]{2}-\d{4}-\d{6}-[A-Z]{3}$/.test(cat)) {
      return cat
    }
  }
  return undefined
}

function extractCountryFromCategories(categories: string[]): string | undefined {
  // ReliefWeb categories may include country names; pick the first that looks like a proper name
  for (const c of categories) {
    const s = String(c).trim()
    if (!s) continue
    // Skip GLIDE numbers
    if (/^[A-Z]{2}-\d{4}-\d{6}-[A-Z]{3}$/.test(s)) continue
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

function extractAffectedPopulation(text: string): number | undefined {
  // Use the existing parseNumberNearKeywords function to extract affected population
  const affected = parseNumberNearKeywords(text, /(affected|displaced|evacuated|people.*affected|affected.*people|population.*affected|affected.*population)/gi)
  return affected
}

function inferSeverityFromText(text: string, disasterType: string): 'GREEN'|'ORANGE'|'RED' {
  const t = text.toLowerCase()
  
  // Strong keywords for RED severity
  const redWords = /(catastrophic|devastating|massive\s+destruction|widespread\s+destruction|disaster\s+declared|state\s+of\s+calamity|national\s+emergency)/i
  
  // Moderate keywords for ORANGE severity  
  const orangeWords = /(major|severe|state\s+of\s+emergency|evacuation|evacuations|flash\s+flood|emergency\s+declared|widespread|critical)/i

  // Numeric signals
  const mag = parseMagnitude(text)
  const cat = parseCycloneCategory(text)
  const deaths = parseNumberNearKeywords(text, /(death|deaths|killed|fatalities|died)/gi)
  const affected = parseNumberNearKeywords(text, /(affected|displaced|evacuated|people)/gi)
  const injured = parseNumberNearKeywords(text, /(injured|injuries)/gi)

  // Type-specific severity assessment
  if (disasterType === 'earthquake') {
    if (mag !== undefined) {
      if (mag >= 6.5) return 'RED'
      if (mag >= 5.5) return 'ORANGE'
    }
    if (deaths !== undefined) {
      if (deaths >= 100) return 'RED'
      if (deaths >= 10) return 'ORANGE'
    }
  }
  
  if (disasterType === 'cyclone') {
    if (cat !== undefined) {
      if (cat >= 3) return 'RED'
      if (cat >= 1) return 'ORANGE'
    }
  }
  
  if (disasterType === 'flood') {
    if (deaths !== undefined && deaths >= 50) return 'RED'
    if (affected !== undefined && affected >= 100_000) return 'RED'
    if (deaths !== undefined && deaths >= 10) return 'ORANGE'
    if (affected !== undefined && affected >= 10_000) return 'ORANGE'
  }
  
  if (disasterType === 'wildfire') {
    if (/out\s+of\s+control|uncontrolled|evacuations|homes?\s+destroyed/i.test(text)) return 'ORANGE'
    if (deaths !== undefined && deaths >= 5) return 'RED'
  }
  
  if (disasterType === 'epidemic') {
    // Disease outbreaks - focus on spread and fatality rate
    if (deaths !== undefined && deaths >= 20) return 'RED'
    if (affected !== undefined && affected >= 1000) return 'ORANGE'
    if (/outbreak\s+declared|epidemic|pandemic/i.test(text)) return 'ORANGE'
  }
  
  if (disasterType === 'drought') {
    if (affected !== undefined && affected >= 1_000_000) return 'RED'
    if (affected !== undefined && affected >= 100_000) return 'ORANGE'
    if (/severe\s+drought|prolonged\s+drought|acute\s+food\s+insecurity|famine/i.test(text)) return 'ORANGE'
  }
  
  if (disasterType === 'heatwave') {
    if (deaths !== undefined && deaths >= 10) return 'RED'
    if (/extreme\s+heat|record\s+temperature|heat\s+emergency/i.test(text)) return 'ORANGE'
  }

  // Generic thresholds for casualties and affected populations
  if (deaths !== undefined) {
    if (deaths >= 100) return 'RED'
    if (deaths >= 10) return 'ORANGE'
  }
  
  if (injured !== undefined && injured >= 100) return 'ORANGE'
  
  if (affected !== undefined) {
    if (affected >= 500_000) return 'RED'
    if (affected >= 50_000) return 'ORANGE'
  }

  // Keyword-based fallback
  if (redWords.test(text)) return 'RED'
  if (orangeWords.test(text)) return 'ORANGE'

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
    
    const title: string = String(it.title || '')
    const description: string = it.description ? String(it.description) : ''
    const pub = it.pubDate ? new Date(it.pubDate) : new Date()
    const when = isNaN(pub.getTime()) ? new Date() : pub
    const categories = extractCategories(it)
    
    // Enhanced country extraction - try description first, then categories
    const countryFromDesc = extractCountryFromDescription(description)
    const countryFromCats = extractCountryFromCategories(categories)
    const countryName = (countryFromDesc || countryFromCats)?.replace(/\(.*?\)/g, '').trim()
    
    // Extract GLIDE number for more specific external_id
    const glideNumber = extractGlideNumber(description, categories)
    const ext = glideNumber ? `reliefweb:${glideNumber}` : `reliefweb:${guid}`
    
    // Enhanced disaster type inference using all available text
    const fullText = `${title} ${description} ${categories.join(' ')}`
    const disaster_type = inferTypeFromText(fullText)
    const severity: ParsedReliefWebItem['severity'] = inferSeverityFromText(fullText, disaster_type)
    
    // Extract affected population from all available text
    const affected_population = extractAffectedPopulation(fullText)

    result.push({
      external_id: ext,
      disaster_type,
      severity,
      title,
      country: (countryName && resolveCountryIso2(countryName)) || undefined,
      event_timestamp: when.toISOString(),
      description,
      affected_population,
    })
  }
  return result
}
