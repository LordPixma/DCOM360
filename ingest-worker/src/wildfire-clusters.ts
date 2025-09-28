// wildfire-clusters.ts - Aggregate wildfire disasters into spatial-temporal clusters
// Algorithm: Spatial clustering of recent wildfire events using simple distance-based grouping

// Use the local Env type definition
type Env = {
  DB: D1Database
  CACHE: KVNamespace
}

export interface WildfireDetectionPoint {
  id: number
  lat: number
  lng: number
  timestamp: string
  severity: string
  magnitude?: number
}

export interface ClusterComputationResult {
  inserted: number
  updated: number
  durationMs: number
}

// Simple geohash-like spatial key for clustering (precision ~50km)
function spatialKey(lat: number, lng: number, precision = 1): string {
  const latBin = Math.floor(lat / precision)
  const lngBin = Math.floor(lng / precision)
  return `${latBin},${lngBin}`
}

// Haversine distance formula for Earth distances
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371 // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + 
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

// Calculate intensity score based on count, severity, and recency
function calculateIntensityScore(count: number, hasRed: boolean, hasOrange: boolean, avgAge: number): number {
  let score = count * 10 // Base count score
  if (hasRed) score *= 2.0
  else if (hasOrange) score *= 1.5
  
  // Recency factor: reduce score for older clusters (max age 7 days)
  const ageFactor = Math.max(0.1, 1.0 - (avgAge / (7 * 24 * 60 * 60 * 1000)))
  return score * ageFactor
}

export async function computeWildfireClusters(env: Env, opts: { now?: Date } = {}): Promise<ClusterComputationResult> {
  const started = Date.now()
  const now = opts.now || new Date()
  
  // Query recent wildfire disasters (last 7 days)
  const cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
  
  const wildfires = await env.DB.prepare(`
    SELECT id, coordinates_lat as lat, coordinates_lng as lng, event_timestamp as timestamp, 
           severity, magnitude, title, country
    FROM disasters 
    WHERE disaster_type = 'wildfire' 
      AND is_active = 1 
      AND event_timestamp >= ?
      AND coordinates_lat IS NOT NULL 
      AND coordinates_lng IS NOT NULL
    ORDER BY event_timestamp DESC
  `).bind(cutoffDate).all()

  if (!wildfires.results.length) {
    const durationMs = Date.now() - started
    return { inserted: 0, updated: 0, durationMs }
  }

  // Spatial clustering: group by approximate spatial bins
  const spatialGroups = new Map<string, WildfireDetectionPoint[]>()
  
  for (const fire of wildfires.results as any[]) {
    const key = spatialKey(fire.lat, fire.lng, 0.5) // ~50km precision
    if (!spatialGroups.has(key)) {
      spatialGroups.set(key, [])
    }
    spatialGroups.get(key)!.push(fire)
  }

  // Merge nearby spatial groups (within 100km) to handle border cases
  const clusters: WildfireDetectionPoint[][] = []
  const processed = new Set<string>()

  for (const [key, fires] of spatialGroups) {
    if (processed.has(key)) continue
    
    const cluster = [...fires]
    processed.add(key)
    
    // Check for nearby groups to merge
    for (const [otherKey, otherFires] of spatialGroups) {
      if (otherKey === key || processed.has(otherKey)) continue
      
      // Calculate distance between cluster centroids
      const centroid1 = {
        lat: fires.reduce((sum, f) => sum + f.lat, 0) / fires.length,
        lng: fires.reduce((sum, f) => sum + f.lng, 0) / fires.length
      }
      const centroid2 = {
        lat: otherFires.reduce((sum, f) => sum + f.lat, 0) / otherFires.length,
        lng: otherFires.reduce((sum, f) => sum + f.lng, 0) / otherFires.length
      }
      
      if (haversineDistance(centroid1.lat, centroid1.lng, centroid2.lat, centroid2.lng) < 100) {
        cluster.push(...otherFires)
        processed.add(otherKey)
      }
    }
    
    // Only create clusters with multiple fires or significant single fires
    if (cluster.length > 1 || cluster.some(f => f.severity === 'RED')) {
      clusters.push(cluster)
    }
  }

  let inserted = 0
  let updated = 0

  // Process each cluster
  for (const cluster of clusters) {
    // Calculate cluster metrics
    const centroidLat = cluster.reduce((sum, f) => sum + f.lat, 0) / cluster.length
    const centroidLng = cluster.reduce((sum, f) => sum + f.lng, 0) / cluster.length
    
    const timestamps = cluster.map(f => new Date(f.timestamp).getTime())
    const firstDetected = new Date(Math.min(...timestamps)).toISOString()
    const lastDetected = new Date(Math.max(...timestamps)).toISOString()
    
    // Time-based metrics
    const last6h = now.getTime() - 6 * 60 * 60 * 1000
    const last24h = now.getTime() - 24 * 60 * 60 * 1000
    
    const detections6h = cluster.filter(f => new Date(f.timestamp).getTime() > last6h).length
    const detections24h = cluster.filter(f => new Date(f.timestamp).getTime() > last24h).length
    
    // Growth rate estimation (simplified)
    const prev6hStart = last6h - 6 * 60 * 60 * 1000
    const prev6hDetections = cluster.filter(f => {
      const t = new Date(f.timestamp).getTime()
      return t > prev6hStart && t <= last6h
    }).length
    
    const growthRate = prev6hDetections > 0 ? (detections6h / prev6hDetections) - 1 : 0
    
    // Area estimation (simple bounding box)
    const lats = cluster.map(f => f.lat)
    const lngs = cluster.map(f => f.lng)
    const latSpan = Math.max(...lats) - Math.min(...lats)
    const lngSpan = Math.max(...lngs) - Math.min(...lngs)
    const areaEstimate = latSpan * lngSpan * 111 * 111 // Rough km² estimate
    
    // Intensity scoring
    const hasRed = cluster.some(f => f.severity === 'RED')
    const hasOrange = cluster.some(f => f.severity === 'ORANGE')
    const avgAge = timestamps.reduce((sum, t) => sum + (now.getTime() - t), 0) / timestamps.length
    const intensityScore = calculateIntensityScore(cluster.length, hasRed, hasOrange, avgAge)
    
    // Create deterministic cluster key
    const clusterKey = `wf_${Math.round(centroidLat * 100)}_${Math.round(centroidLng * 100)}_${firstDetected.slice(0, 10)}`
    
    // Upsert cluster
    const result = await env.DB.prepare(`
      INSERT INTO wildfire_clusters (
        cluster_key, centroid_lat, centroid_lng, detections_6h, detections_24h,
        growth_rate, area_estimate_km2, intensity_score, first_detected, last_detected
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(cluster_key) DO UPDATE SET
        detections_6h = excluded.detections_6h,
        detections_24h = excluded.detections_24h,
        growth_rate = excluded.growth_rate,
        area_estimate_km2 = excluded.area_estimate_km2,
        intensity_score = excluded.intensity_score,
        last_detected = excluded.last_detected,
        updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now')
    `).bind(
      clusterKey, centroidLat, centroidLng, detections6h, detections24h,
      growthRate, areaEstimate, intensityScore, firstDetected, lastDetected
    ).run()
    
    if (result.success) {
      // For SQLite UPSERT, we can't easily distinguish insert vs update
      // For simplicity, count all successes as "updated"
      updated++
    }
  }

  const durationMs = Date.now() - started
  console.log(`Wildfire clustering: processed ${wildfires.results.length} fires into ${clusters.length} clusters (${inserted} new, ${updated} updated) in ${durationMs}ms`)
  
  return { inserted, updated, durationMs }
}
