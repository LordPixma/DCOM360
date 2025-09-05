export interface Env {
  DB: D1Database
  CACHE?: KVNamespace
  ENV_ORIGIN?: string
  ADMIN_TOKEN?: string
}

export type SeverityDb = 'RED' | 'ORANGE' | 'GREEN'

export type DisasterRow = {
  id: string | number
  disaster_type: string
  severity: SeverityDb
  title: string
  country?: string | null
  coordinates_lat?: number | null
  coordinates_lng?: number | null
  event_timestamp: string
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
}
