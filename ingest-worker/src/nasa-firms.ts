export type ParsedFIRMSItem = {
  external_id: string
  disaster_type: 'wildfire'
  severity: 'GREEN' | 'ORANGE' | 'RED'
  title: string
  country?: string
  coordinates_lat: number
  coordinates_lng: number
  event_timestamp: string
  description?: string
  affected_population?: number
}

// NASA FIRMS (Fire Information for Resource Management System) parser
// Uses CSV API to get active fire detection data from MODIS and VIIRS satellites
export function parseFIRMSResponse(csvContent: string): ParsedFIRMSItem[] {
  try {
    console.log('Parsing NASA FIRMS CSV response');
    
    const lines = csvContent.trim().split('\n');
    if (lines.length <= 1) {
      console.log('No fire data found in FIRMS response');
      return [];
    }

    // Expected CSV headers for MODIS/VIIRS active fire data:
    // latitude,longitude,brightness,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_t31,frp,daynight
    const headers = lines[0].split(',').map(h => h.trim());
    const disasters: ParsedFIRMSItem[] = [];

    console.log(`Found ${lines.length - 1} fire detection records`);

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length < headers.length) continue;

        const record: Record<string, string> = {};
        headers.forEach((header, index) => {
          record[header] = values[index];
        });

        const disaster = parseFIRMSRecord(record);
        if (disaster) {
          disasters.push(disaster);
        }
      } catch (error) {
        console.error(`Error parsing FIRMS record at line ${i}:`, error);
        // Continue processing other records
      }
    }

    console.log(`Successfully parsed ${disasters.length} fire detections`);
    return disasters;
  } catch (error) {
    console.error('Error parsing FIRMS CSV response:', error);
    return [];
  }
}

function parseFIRMSRecord(record: Record<string, string>): ParsedFIRMSItem | null {
  try {
    const latitude = parseFloat(record.latitude);
    const longitude = parseFloat(record.longitude);
    const confidence = parseInt(record.confidence || '0', 10);
    const brightness = parseFloat(record.brightness || '0');
    const frp = parseFloat(record.frp || '0'); // Fire Radiative Power
    const acq_date = record.acq_date; // YYYY-MM-DD
    const acq_time = record.acq_time; // HHMM
    const satellite = record.satellite || 'Unknown';
    const instrument = record.instrument || 'Unknown';

    // Validate required fields
    if (isNaN(latitude) || isNaN(longitude) || !acq_date || !acq_time) {
      return null;
    }

    // Create timestamp from date and time
    const year = acq_date.substring(0, 4);
    const month = acq_date.substring(5, 7);
    const day = acq_date.substring(8, 10);
    const hour = acq_time.substring(0, 2);
    const minute = acq_time.substring(2, 4);
    const timestamp = `${year}-${month}-${day}T${hour}:${minute}:00Z`;

    // Generate unique external ID based on coordinates and timestamp
    const external_id = `firms-${latitude.toFixed(4)}-${longitude.toFixed(4)}-${acq_date}-${acq_time}`;

    // Determine severity based on confidence, brightness, and FRP
    let severity: 'GREEN' | 'ORANGE' | 'RED' = 'GREEN';
    
    // High confidence (>80%) or high FRP (>100 MW) indicates major fire
    if (confidence >= 80 || frp >= 100) {
      severity = 'RED';
    } 
    // Medium confidence (50-79%) or medium FRP (50-99 MW) indicates moderate fire
    else if (confidence >= 50 || frp >= 50) {
      severity = 'ORANGE';
    }
    // Low confidence (<50%) or low FRP (<50 MW) indicates minor fire/smoke
    else {
      severity = 'GREEN';
    }

    // Create descriptive title
    const confidenceDesc = confidence >= 80 ? 'High' : confidence >= 50 ? 'Medium' : 'Low';
    const title = `Active Fire Detection (${confidenceDesc} Confidence)`;

    // Create description with fire characteristics
    const description = [
      `Satellite: ${satellite} ${instrument}`,
      `Confidence: ${confidence}%`,
      brightness > 0 ? `Brightness: ${brightness.toFixed(1)}K` : null,
      frp > 0 ? `Fire Radiative Power: ${frp.toFixed(1)} MW` : null,
      `Detection: ${acq_date} ${acq_time} UTC`
    ].filter(Boolean).join(' | ');

    // Determine country from coordinates (simplified approach)
    const country = determineCountryFromCoordinates(latitude, longitude);

    return {
      external_id,
      disaster_type: 'wildfire',
      severity,
      title,
      country,
      coordinates_lat: latitude,
      coordinates_lng: longitude,
      event_timestamp: timestamp,
      description,
      affected_population: undefined
    };
  } catch (error) {
    console.error('Error parsing FIRMS record:', error);
    return null;
  }
}

// Simple country determination based on coordinate ranges
// This is a basic implementation - in production, you'd use a proper geocoding service
function determineCountryFromCoordinates(lat: number, lng: number): string | undefined {
  // USA (continental)
  if (lat >= 24 && lat <= 49 && lng >= -125 && lng <= -66) {
    return 'US';
  }
  
  // Canada
  if (lat >= 42 && lat <= 70 && lng >= -141 && lng <= -52) {
    return 'CA';
  }
  
  // Mexico
  if (lat >= 14 && lat <= 33 && lng >= -118 && lng <= -86) {
    return 'MX';
  }
  
  // Australia
  if (lat >= -44 && lat <= -10 && lng >= 113 && lng <= 154) {
    return 'AU';
  }
  
  // Brazil (simplified)
  if (lat >= -34 && lat <= 6 && lng >= -74 && lng <= -32) {
    return 'BR';
  }
  
  // Russia (simplified)
  if (lat >= 41 && lat <= 82 && lng >= 20 && lng <= 170) {
    return 'RU';
  }
  
  // China (simplified)  
  if (lat >= 18 && lat <= 54 && lng >= 73 && lng <= 135) {
    return 'CN';
  }
  
  // India (simplified)
  if (lat >= 8 && lat <= 37 && lng >= 68 && lng <= 97) {
    return 'IN';
  }
  
  // Add more countries as needed
  return undefined;
}

// Fetch active fire data from FIRMS API for a global area
export async function fetchFIRMSGlobalData(mapKey: string, daysBack: number = 1): Promise<ParsedFIRMSItem[]> {
  try {
    // Global bounding box (entire world)
    const bbox = '-180,-90,180,90';
    
    // MODIS NRT (Near Real Time) data source
    const source = 'MODIS_NRT';
    
    // API URL format: /api/area/csv/[MAP_KEY]/[SOURCE]/[AREA_COORDINATES]/[DAY_RANGE]/[DATE]
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${mapKey}/${source}/${bbox}/${daysBack}/${today}`;
    
    console.log(`Fetching FIRMS data from: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Flare360-DisasterMonitoring/1.0 (disaster-monitoring)'
      }
    });
    
    if (!response.ok) {
      throw new Error(`FIRMS API returned ${response.status}: ${response.statusText}`);
    }
    
    const csvContent = await response.text();
    
    // Check for API error messages
    if (csvContent.includes('Invalid MAP_KEY') || csvContent.includes('Error:')) {
      throw new Error(`FIRMS API error: ${csvContent}`);
    }
    
    return parseFIRMSResponse(csvContent);
  } catch (error) {
    console.error('Error fetching FIRMS data:', error);
    throw error;
  }
}

// Fetch regional fire data for better performance (smaller areas = faster response)
export async function fetchFIRMSRegionalData(mapKey: string, region: 'north_america' | 'europe' | 'asia' | 'oceania' | 'south_america' | 'africa', daysBack: number = 1): Promise<ParsedFIRMSItem[]> {
  try {
    // Regional bounding boxes
    const regions = {
      north_america: '-170,15,-50,75',     // North America
      europe: '-25,35,45,75',              // Europe  
      asia: '25,10,180,80',                // Asia
      oceania: '110,-50,180,0',            // Oceania/Australia
      south_america: '-85,-60,-30,15',     // South America
      africa: '-20,-40,55,40'              // Africa
    };
    
    const bbox = regions[region];
    const source = 'MODIS_NRT';
    const today = new Date().toISOString().split('T')[0];
    
    const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${mapKey}/${source}/${bbox}/${daysBack}/${today}`;
    
    console.log(`Fetching FIRMS ${region} data from: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Flare360-DisasterMonitoring/1.0 (disaster-monitoring)'
      }
    });
    
    if (!response.ok) {
      throw new Error(`FIRMS API returned ${response.status}: ${response.statusText}`);
    }
    
    const csvContent = await response.text();
    return parseFIRMSResponse(csvContent);
  } catch (error) {
    console.error(`Error fetching FIRMS ${region} data:`, error);
    throw error;
  }
}