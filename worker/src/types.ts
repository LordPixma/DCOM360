export interface Env {
  DB: D1Database
  CACHE?: KVNamespace
  ENV_ORIGIN?: string
  ADMIN_TOKEN?: string
  JWT_SECRET?: string
}

export type SeverityDb = 'RED' | 'ORANGE' | 'GREEN'

export type DisasterRow = {
  id: string | number
  external_id?: string
  disaster_type: string
  severity: SeverityDb
  title: string
  country?: string | null
  coordinates_lat?: number | null
  coordinates_lng?: number | null
  event_timestamp: string
  affected_population?: number | null
}

export type Disaster = {
  id: string
  type: string
  severity: 'green' | 'yellow' | 'red'
  country?: string
  latitude?: number
  longitude?: number
  title: string
  occurred_at: string
  affected_population?: number
  source?: string
}

// --- Phase 1 Extended Domain Models ---

export interface CycloneRow {
  id: number | string
  external_id?: string | null
  name: string
  basin?: string | null
  category?: string | null
  latitude?: number | null
  longitude?: number | null
  max_wind_kt?: number | null
  min_pressure_mb?: number | null
  movement_dir?: string | null
  movement_speed_kt?: number | null
  advisory_time: string
  forecast_json?: string | null
  updated_at: string
}

export interface Cyclone {
  id: string
  name: string
  basin?: string
  category?: string
  position?: { lat: number; lng: number }
  max_wind_kt?: number
  min_pressure_mb?: number
  movement?: { direction?: string; speed_kt?: number }
  advisory_time: string
  forecast?: Array<{ time: string; lat: number; lng: number; wind_kt?: number }>
}

export interface WildfireClusterRow {
  id: number | string
  cluster_key: string
  centroid_lat: number
  centroid_lng: number
  detections_6h: number
  detections_24h: number
  growth_rate?: number | null
  area_estimate_km2?: number | null
  intensity_score?: number | null
  first_detected?: string | null
  last_detected?: string | null
  updated_at: string
}

export interface WildfireCluster {
  id: string
  cluster_key: string
  centroid: { lat: number; lng: number }
  detections_6h: number
  detections_24h: number
  growth_rate?: number
  area_estimate_km2?: number
  intensity_score?: number
  first_detected?: string
  last_detected?: string
  trend?: 'rising' | 'falling' | 'stable'
}

export interface FeedHealthRow {
  id: number | string
  feed_name: string
  last_success?: string | null
  last_error?: string | null
  error_count: number
  avg_latency_ms?: number | null
  consecutive_failures: number
  status?: string | null
  notes?: string | null
  updated_at: string
}

export interface FeedHealth {
  feed: string
  status: 'OK' | 'DEGRADED' | 'FAILING'
  last_success?: string
  last_error?: string
  error_count: number
  avg_latency_ms?: number
  consecutive_failures: number
  notes?: string
  freshness_seconds?: number // computed at read time
}

