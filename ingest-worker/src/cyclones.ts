// cyclones.ts - Phase 1 stub for cyclone advisory ingestion
// Strategy: Start with placeholder that logs and returns empty until a public feed (e.g., NOAA NHC) integration is implemented.
// Design Notes:
// - We'll later map basin codes (AL/EP/CP) and parse advisory text or JSON (if proxied)
// - For MVP, support manual injection / test harness

import { Env } from '../../worker/src/types'

export interface CycloneAdvisoryInput {
  external_id?: string
  name: string
  basin?: string
  category?: string
  latitude?: number
  longitude?: number
  max_wind_kt?: number
  min_pressure_mb?: number
  movement_dir?: string
  movement_speed_kt?: number
  advisory_time: string
  forecast?: Array<{ time: string; lat: number; lng: number; wind_kt?: number }>
}

export async function ingestCyclones(env: Env, opts: { now?: Date } = {}) {
  const started = Date.now()
  const nowIso = (opts.now || new Date()).toISOString()
  const inserted: string[] = []

  // Placeholder: no remote fetch yet
  // Future: fetch basin-specific active storms and upsert advisory records

  // Example: manual stub entry (commented out by default)
  // const sample: CycloneAdvisoryInput = {
  //   external_id: 'AL012025_2025-09-28-1500Z',
  //   name: 'ALPHA',
  //   basin: 'AL',
  //   category: 'Tropical Storm',
  //   latitude: 18.5,
  //   longitude: -54.2,
  //   max_wind_kt: 45,
  //   advisory_time: nowIso,
  //   movement_dir: 'NW',
  //   movement_speed_kt: 10,
  //   forecast: [
  //     { time: new Date(Date.now()+6*3600e3).toISOString(), lat: 19.2, lng: -55.0, wind_kt: 50 },
  //   ]
  // }
  // await upsertCyclone(env, sample)
  // inserted.push(sample.external_id!)

  const durationMs = Date.now() - started
  return { inserted, durationMs }
}

export async function upsertCyclone(env: Env, data: CycloneAdvisoryInput) {
  const forecastJson = data.forecast ? JSON.stringify(data.forecast) : null
  const sql = `INSERT INTO cyclones (external_id, name, basin, category, latitude, longitude, max_wind_kt, min_pressure_mb, movement_dir, movement_speed_kt, advisory_time, forecast_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(external_id, advisory_time) DO UPDATE SET
      name=excluded.name,
      category=excluded.category,
      latitude=excluded.latitude,
      longitude=excluded.longitude,
      max_wind_kt=excluded.max_wind_kt,
      min_pressure_mb=excluded.min_pressure_mb,
      movement_dir=excluded.movement_dir,
      movement_speed_kt=excluded.movement_speed_kt,
      forecast_json=excluded.forecast_json,
      updated_at=strftime('%Y-%m-%dT%H:%M:%SZ','now')`

  await env.DB.prepare(sql).bind(
    data.external_id || null,
    data.name,
    data.basin || null,
    data.category || null,
    data.latitude ?? null,
    data.longitude ?? null,
    data.max_wind_kt ?? null,
    data.min_pressure_mb ?? null,
    data.movement_dir || null,
    data.movement_speed_kt ?? null,
    data.advisory_time,
    forecastJson
  ).run()
}
