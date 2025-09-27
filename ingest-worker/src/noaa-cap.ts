import { XMLParser } from 'fast-xml-parser'

export type ParsedNOAACAPItem = {
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

// NOAA CAP (Common Alerting Protocol) parser for US alerts including tsunami warnings
export function parseNOAACAPFeed(xmlContent: string): ParsedNOAACAPItem[] {
  try {
    console.log('Parsing NOAA CAP feed XML');
    
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      parseAttributeValue: true
    });
    
    const doc = parser.parse(xmlContent);
    
    if (!doc.feed || !doc.feed.entry) {
      console.log('No entries found in NOAA CAP feed');
      return [];
    }

    // Ensure entries is always an array
    const entries = Array.isArray(doc.feed.entry) ? doc.feed.entry : [doc.feed.entry];
    const disasters: ParsedNOAACAPItem[] = [];

    console.log(`Found ${entries.length} CAP alert entries`);

    for (const entry of entries) {
      try {
        const disaster = parseNOAACAPEntry(entry);
        if (disaster) {
          disasters.push(disaster);
        }
      } catch (error) {
        console.error('Error parsing NOAA CAP entry:', error);
        // Continue processing other entries
      }
    }

    console.log(`Parsed ${disasters.length} disasters from NOAA CAP feed`);
    return disasters;
  } catch (error) {
    console.error('Error parsing NOAA CAP feed XML:', error);
    throw error;
  }
}

function parseNOAACAPEntry(entry: any): ParsedNOAACAPItem | null {
  // Get basic fields from parsed JSON structure
  const id = entry.id || '';
  const title = entry.title || '';
  const summary = entry.summary || '';
  const updated = entry.updated || '';
  const published = entry.published || '';

  if (!id || !title) {
    return null;
  }

  // Skip test messages and monitoring messages
  if (title.toLowerCase().includes('test message') || 
      summary.toLowerCase().includes('monitoring message') ||
      summary.toLowerCase().includes('please disregard')) {
    return null;
  }

  // Get CAP-specific fields - they should be in the entry object
  const capEvent = entry['cap:event'] || '';
  const capSeverity = entry['cap:severity'] || '';
  const capUrgency = entry['cap:urgency'] || '';
  const capAreaDesc = entry['cap:areaDesc'] || '';
  const capPolygon = entry['cap:polygon'] || '';
  
  // Map CAP event to our disaster type
  const disasterType = mapCAPEventToDisasterType(capEvent, title);
  
  // Skip if we don't handle this type of alert
  if (!disasterType) {
    return null;
  }

  // Map severity to our system
  const severity = mapCAPSeverityToOurs(capSeverity, capUrgency, title);
  
  // Extract location information
  const location = extractLocationFromCAP(capAreaDesc, capPolygon);
  
  // Use published date if available, otherwise updated
  const dateStr = published || updated;
  const date = dateStr ? new Date(dateStr) : new Date();

  // Create external ID from the NOAA alert ID
  const externalId = `noaa-cap-${extractAlertIdFromUrl(id)}`;

  const disaster: ParsedNOAACAPItem = {
    external_id: externalId,
    disaster_type: disasterType,
    severity: severity as 'GREEN' | 'ORANGE' | 'RED',
    title: title,
    description: summary || title,
    event_timestamp: date.toISOString(),
    coordinates_lat: location.latitude || undefined,
    coordinates_lng: location.longitude || undefined,
    country: location.country,
    affected_population: estimateAffectedPopulation(capSeverity, capUrgency, capAreaDesc),
  };

  return disaster;
}



function mapCAPEventToDisasterType(capEvent: string | null, title: string): string | null {
  if (!capEvent && !title) return null;
  
  const eventText = (capEvent || title).toLowerCase();
  
  // Tsunami alerts
  if (eventText.includes('tsunami')) {
    return 'other'; // We don't have a specific tsunami type, use 'other'
  }
  
  // Flood events
  if (eventText.includes('flood') || eventText.includes('flash flood')) {
    return 'flood';
  }
  
  // Fire weather - map to wildfire
  if (eventText.includes('red flag') || eventText.includes('fire weather') || 
      eventText.includes('extreme fire')) {
    return 'wildfire';
  }
  
  // Severe weather that could be cyclone-related
  if (eventText.includes('hurricane') || eventText.includes('tropical storm') || 
      eventText.includes('typhoon') || eventText.includes('cyclone')) {
    return 'cyclone';
  }
  
  // Earthquake-related (rare in CAP but possible)
  if (eventText.includes('earthquake') || eventText.includes('seismic')) {
    return 'earthquake';
  }
  
  // Landslide
  if (eventText.includes('landslide') || eventText.includes('debris flow')) {
    return 'landslide';
  }
  
  // Drought
  if (eventText.includes('drought') || eventText.includes('water shortage')) {
    return 'drought';
  }
  
  // For now, skip other types of alerts (beach hazards, air quality, etc.)
  // We can add them later if needed
  return null;
}

function mapCAPSeverityToOurs(severity: string | null, urgency: string | null, title: string): string {
  const sev = (severity || '').toLowerCase();
  const urg = (urgency || '').toLowerCase();
  const titleLower = title.toLowerCase();
  
  // Tsunami warnings are always RED
  if (titleLower.includes('tsunami warning')) {
    return 'RED';
  }
  
  // Extreme events are RED
  if (sev === 'extreme' || titleLower.includes('extreme') || titleLower.includes('emergency')) {
    return 'RED';
  }
  
  // Severe + Immediate = RED
  if (sev === 'severe' && urg === 'immediate') {
    return 'RED';
  }
  
  // Flash Flood Warnings are typically RED
  if (titleLower.includes('flash flood warning')) {
    return 'RED';
  }
  
  // Warnings are typically ORANGE
  if (titleLower.includes('warning') && !titleLower.includes('watch')) {
    return 'ORANGE';
  }
  
  // Severe events are ORANGE
  if (sev === 'severe') {
    return 'ORANGE';
  }
  
  // Moderate events are ORANGE
  if (sev === 'moderate') {
    return 'ORANGE';
  }
  
  // Minor events or advisories are GREEN
  if (sev === 'minor' || titleLower.includes('advisory') || titleLower.includes('watch')) {
    return 'GREEN';
  }
  
  // Default to ORANGE for safety
  return 'ORANGE';
}

function extractLocationFromCAP(areaDesc: string | null, polygon: string | null): {
  latitude: number | null;
  longitude: number | null;
  country: string;
} {
  // Default to US since this is a US CAP feed
  let country = 'US';
  let latitude: number | null = null;
  let longitude: number | null = null;
  
  // Try to extract coordinates from polygon
  if (polygon && polygon.trim()) {
    const coords = parsePolygonCoordinates(polygon);
    if (coords.length > 0) {
      // Use the centroid of the polygon
      latitude = coords.reduce((sum, coord) => sum + coord.lat, 0) / coords.length;
      longitude = coords.reduce((sum, coord) => sum + coord.lng, 0) / coords.length;
    }
  }
  
  // If no polygon coordinates, try to get approximate location from area description
  if (!latitude && areaDesc) {
    const location = estimateLocationFromAreaDesc(areaDesc);
    latitude = location.latitude;
    longitude = location.longitude;
  }
  
  // Check if it's a US territory
  if (areaDesc) {
    const areaLower = areaDesc.toLowerCase();
    if (areaLower.includes('puerto rico') || areaLower.includes('pr')) {
      country = 'PR';
    } else if (areaLower.includes('virgin islands') || areaLower.includes('vi')) {
      country = 'VI';
    } else if (areaLower.includes('guam') || areaLower.includes('gu')) {
      country = 'GU';
    }
  }
  
  return { latitude, longitude, country };
}

function parsePolygonCoordinates(polygon: string): Array<{lat: number, lng: number}> {
  const coords: Array<{lat: number, lng: number}> = [];
  
  // Polygon format: "lat1,lng1 lat2,lng2 lat3,lng3 ..."
  const pairs = polygon.trim().split(/\s+/);
  
  for (const pair of pairs) {
    const [latStr, lngStr] = pair.split(',');
    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);
    
    if (!isNaN(lat) && !isNaN(lng)) {
      coords.push({ lat, lng });
    }
  }
  
  return coords;
}

function estimateLocationFromAreaDesc(areaDesc: string): {
  latitude: number | null;
  longitude: number | null;
} {
  // Very basic location estimation based on known areas
  // This is a simplified approach - in production, you'd want a more comprehensive mapping
  
  const areaLower = areaDesc.toLowerCase();
  
  // Some common areas and their approximate coordinates
  const locationMap: Record<string, {lat: number, lng: number}> = {
    'california': { lat: 36.7783, lng: -119.4179 },
    'florida': { lat: 27.6648, lng: -81.5158 },
    'texas': { lat: 31.9686, lng: -99.9018 },
    'new york': { lat: 42.1657, lng: -74.9481 },
    'washington': { lat: 47.7511, lng: -120.7401 },
    'oregon': { lat: 43.8041, lng: -120.5542 },
    'nevada': { lat: 38.8026, lng: -116.4194 },
    'arizona': { lat: 34.0489, lng: -111.0937 },
    'hawaii': { lat: 19.8968, lng: -155.5828 },
    'alaska': { lat: 64.0685, lng: -152.2782 },
    'puerto rico': { lat: 18.2208, lng: -66.5901 },
  };
  
  for (const [region, coords] of Object.entries(locationMap)) {
    if (areaLower.includes(region)) {
      return { latitude: coords.lat, longitude: coords.lng };
    }
  }
  
  // Default to center of continental US
  return { latitude: 39.8283, longitude: -98.5795 };
}

function extractAlertIdFromUrl(url: string): string {
  // Extract a unique identifier from the NOAA alert URL
  // URL format: https://api.weather.gov/alerts/urn:oid:2.49.0.1.840.0.{hash}.{version}.{subversion}
  const match = url.match(/urn:oid:2\.49\.0\.1\.840\.0\.([a-f0-9]+)\.(\d+)\.(\d+)$/);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }
  
  // Fallback: use last part of URL
  return url.split('/').pop()?.replace(/[^a-zA-Z0-9-]/g, '-') || 'unknown';
}

function estimateAffectedPopulation(severity: string | null, urgency: string | null, areaDesc: string | null): number {
  // Estimate affected population based on severity, urgency, and area
  let basePopulation = 10000; // Default base
  
  // Adjust based on severity
  switch (severity?.toLowerCase()) {
    case 'extreme':
      basePopulation *= 5;
      break;
    case 'severe':
      basePopulation *= 3;
      break;
    case 'moderate':
      basePopulation *= 2;
      break;
    case 'minor':
      basePopulation *= 0.5;
      break;
  }
  
  // Adjust based on urgency
  switch (urgency?.toLowerCase()) {
    case 'immediate':
      basePopulation *= 2;
      break;
    case 'expected':
      basePopulation *= 1.5;
      break;
  }
  
  // Adjust based on area type (very rough estimates)
  if (areaDesc) {
    const areaLower = areaDesc.toLowerCase();
    
    // Large metropolitan areas
    if (areaLower.includes('los angeles') || areaLower.includes('new york') || 
        areaLower.includes('chicago') || areaLower.includes('houston')) {
      basePopulation *= 10;
    }
    // Major cities
    else if (areaLower.includes('city') || areaLower.includes('metro')) {
      basePopulation *= 5;
    }
    // Counties
    else if (areaLower.includes('county')) {
      basePopulation *= 2;
    }
    // Coastal areas (often more populated)
    else if (areaLower.includes('coastal') || areaLower.includes('beach')) {
      basePopulation *= 3;
    }
  }
  
  return Math.round(basePopulation);
}