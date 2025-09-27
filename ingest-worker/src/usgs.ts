import { XMLParser } from 'fast-xml-parser'
import { resolveCountryIso2 } from './parser'

export type ParsedUSGSItem = {
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

function extractMagnitude(title: string): number | null {
  // Extract magnitude from title like "M 7.8 - 127 km E of Petropavlovsk-Kamchatsky, Russia"
  const magnitudeMatch = title.match(/M\s*(\d+(?:\.\d+)?)/i)
  return magnitudeMatch ? parseFloat(magnitudeMatch[1]) : null
}

function extractPagerSeverity(summary: string): 'GREEN' | 'ORANGE' | 'RED' {
  // Extract PAGER alert level from summary HTML
  if (/pager-red|PAGER.*?RED/i.test(summary)) return 'RED'
  if (/pager-orange|PAGER.*?ORANGE/i.test(summary)) return 'ORANGE'
  if (/pager-yellow|PAGER.*?YELLOW/i.test(summary)) return 'ORANGE'  // Treat yellow as orange
  return 'GREEN'
}

function extractLocationFromTitle(title: string): { country?: string; region?: string } {
  // Extract location from title like "M 7.8 - 127 km E of Petropavlovsk-Kamchatsky, Russia"
  const locationMatch = title.match(/(?:km|mi)\s+[NSEW]+\s+of\s+([^,]+),?\s*(.+)$/i)
  if (locationMatch) {
    const city = locationMatch[1]?.trim()
    const countryRegion = locationMatch[2]?.trim()
    return { country: countryRegion, region: city }
  }
  
  // Handle cases like "M 6.4 - Vanuatu region"
  const regionMatch = title.match(/M\s*\d+(?:\.\d+)?\s*-\s*(.+)\s+region$/i)
  if (regionMatch) {
    return { country: regionMatch[1]?.trim() }
  }
  
  // Handle direct country names "M 6.4 - Afghanistan"
  const countryMatch = title.match(/M\s*\d+(?:\.\d+)?\s*-\s*(.+)$/i)
  if (countryMatch) {
    return { country: countryMatch[1]?.trim() }
  }
  
  return {}
}

function extractDepth(summary: string): number | null {
  // Extract depth from HTML like "<dt>Depth</dt><dd>19.50 km (12.12 mi)</dd>"
  const depthMatch = summary.match(/<dt>Depth<\/dt><dd>(\d+(?:\.\d+)?)\s*km/i)
  return depthMatch ? parseFloat(depthMatch[1]) : null
}

function extractTimestamp(summary: string): string | null {
  // Extract UTC timestamp from HTML like "<dt>Time</dt><dd>2025-09-18 18:58:13 UTC</dd>"
  const timeMatch = summary.match(/<dt>Time<\/dt><dd>(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\s+UTC/i)
  if (timeMatch) {
    return `${timeMatch[1]}Z`
  }
  return null
}

function estimateAffectedPopulation(magnitude: number, depth: number | null, summary: string): number | undefined {
  // Estimate affected population based on magnitude, depth, and PAGER level
  if (!magnitude) return undefined
  
  // For significant earthquakes, use PAGER level and magnitude to estimate
  const isRed = /pager-red|PAGER.*?RED/i.test(summary)
  const isOrange = /pager-orange|PAGER.*?ORANGE/i.test(summary)
  const isYellow = /pager-yellow|PAGER.*?YELLOW/i.test(summary)
  
  // Very rough estimates based on historical data
  if (isRed && magnitude >= 7.0) return 1000000  // 1M+ for major disasters
  if (isRed && magnitude >= 6.0) return 500000   // 500K+ for significant red alerts
  if (isOrange && magnitude >= 6.5) return 100000 // 100K+ for major orange alerts
  if (isOrange && magnitude >= 5.5) return 50000  // 50K+ for moderate orange alerts
  if (isYellow && magnitude >= 6.0) return 25000  // 25K+ for yellow alerts
  if (magnitude >= 7.0) return 10000              // Base estimate for M7+
  if (magnitude >= 6.0) return 5000               // Base estimate for M6+
  
  return undefined
}

export function parseUSGSFeed(xmlText: string): ParsedUSGSItem[] {
  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      parseAttributeValue: true,
      trimValues: true,
      processEntities: true
    })
    
    const parsed = parser.parse(xmlText)
    const feed = parsed?.feed
    if (!feed) return []
    
    const entries = Array.isArray(feed.entry) ? feed.entry : (feed.entry ? [feed.entry] : [])
    const results: ParsedUSGSItem[] = []
    
    for (const entry of entries) {
      try {
        const id = entry.id || ''
        const title = entry.title || ''
        const summary = entry.summary?.['#text'] || entry.summary || ''
        const updated = entry.updated || ''
        
        // Extract USGS event ID from URN format: "urn:earthquake-usgs-gov:us:6000rcrj"
        const eventIdMatch = id.match(/urn:earthquake-usgs-gov:([^:]+):(.+)$/)
        const eventId = eventIdMatch ? `${eventIdMatch[1]}_${eventIdMatch[2]}` : id
        const external_id = `usgs:${eventId}`
        
        // Extract coordinates from georss:point
        let coordinates_lat: number | undefined
        let coordinates_lng: number | undefined
        
        if (entry['georss:point']) {
          const coords = String(entry['georss:point']).trim().split(/\s+/)
          if (coords.length >= 2) {
            coordinates_lat = parseFloat(coords[0])
            coordinates_lng = parseFloat(coords[1])
          }
        }
        
        // Extract magnitude and location info
        const magnitude = extractMagnitude(title)
        const locationInfo = extractLocationFromTitle(title)
        const depth = extractDepth(summary)
        const eventTimestamp = extractTimestamp(summary) || updated
        
        // Determine severity from PAGER alert level
        const severity = extractPagerSeverity(summary)
        
        // Estimate affected population
        const affected_population = magnitude ? estimateAffectedPopulation(magnitude, depth, summary) : undefined
        
        // Resolve country ISO code
        let country: string | undefined
        if (locationInfo.country) {
          country = resolveCountryIso2(locationInfo.country) || locationInfo.country
        }
        
        // Build description with key earthquake details
        let description = `Magnitude ${magnitude || 'unknown'} earthquake`
        if (locationInfo.region) {
          description += ` near ${locationInfo.region}`
        }
        if (locationInfo.country) {
          description += ` in ${locationInfo.country}`
        }
        if (depth) {
          description += ` at ${depth} km depth`
        }
        
        // Add PAGER and intensity info if available
        const pagerMatch = summary.match(/PAGER.*?<strong[^>]*>([^<]+)<\/strong>/i)
        if (pagerMatch) {
          description += `. PAGER alert level: ${pagerMatch[1]}`
        }
        
        const shakeMapMatch = summary.match(/ShakeMap.*?<strong[^>]*>([^<]+)<\/strong>/i)
        if (shakeMapMatch) {
          description += `. Maximum intensity: ${shakeMapMatch[1]}`
        }
        
        results.push({
          external_id,
          disaster_type: 'earthquake', // All USGS feeds are earthquakes
          severity,
          title,
          country,
          coordinates_lat,
          coordinates_lng,
          event_timestamp: eventTimestamp,
          description,
          affected_population
        })
        
      } catch (error) {
        console.warn('Failed to parse USGS entry:', error, entry)
        continue
      }
    }
    
    return results
    
  } catch (error) {
    console.error('Failed to parse USGS feed:', error)
    return []
  }
}