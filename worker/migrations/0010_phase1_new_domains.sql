-- 0010_phase1_new_domains.sql
-- Phase 1 schema: cyclones, wildfire_clusters, feed_health
-- Idempotent guards using CREATE TABLE IF NOT EXISTS

-- Cyclones: Active & historical storm advisory snapshots
CREATE TABLE IF NOT EXISTS cyclones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  external_id TEXT,               -- e.g. basin-stormnumber-year or advisory id
  name TEXT NOT NULL,             -- Storm name or INVEST id
  basin TEXT,                     -- e.g. AL, EP, WP
  category TEXT,                  -- e.g. Tropical Storm, Hurricane 1, Typhoon, Depression
  latitude REAL,
  longitude REAL,
  max_wind_kt INTEGER,            -- Maximum sustained wind in knots
  min_pressure_mb INTEGER,        -- Central pressure if available
  movement_dir TEXT,              -- Cardinal direction (e.g., NW)
  movement_speed_kt INTEGER,
  advisory_time TEXT NOT NULL,    -- ISO timestamp of advisory
  forecast_json TEXT,             -- JSON array of forecast points (time, lat, lng, wind_kt)
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  UNIQUE(external_id, advisory_time)
);
CREATE INDEX IF NOT EXISTS idx_cyclones_advisory_time ON cyclones(advisory_time DESC);
CREATE INDEX IF NOT EXISTS idx_cyclones_name ON cyclones(name);

-- Wildfire Clusters: Aggregated FIRMS detections into spatial-temporal clusters
CREATE TABLE IF NOT EXISTS wildfire_clusters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cluster_key TEXT NOT NULL,        -- deterministic hash (e.g., geohash+time bucket)
  centroid_lat REAL NOT NULL,
  centroid_lng REAL NOT NULL,
  detections_6h INTEGER DEFAULT 0,
  detections_24h INTEGER DEFAULT 0,
  growth_rate REAL,                 -- (detections_6h / detections_prev_6h) - 1
  area_estimate_km2 REAL,           -- rough convex hull / buffer estimate
  intensity_score REAL,             -- custom composite (growth + density)
  first_detected TEXT,              -- ISO timestamp of earliest detection in cluster
  last_detected TEXT,               -- ISO timestamp of latest detection
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  UNIQUE(cluster_key)
);
CREATE INDEX IF NOT EXISTS idx_wf_clusters_recent ON wildfire_clusters(last_detected DESC);
CREATE INDEX IF NOT EXISTS idx_wf_clusters_intensity ON wildfire_clusters(intensity_score DESC);

-- Feed Health: Track ingestion performance & freshness
CREATE TABLE IF NOT EXISTS feed_health (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  feed_name TEXT NOT NULL,             -- e.g., reliefweb, gdacs, usgs, nasa_firms, cyclones
  last_success TEXT,                   -- ISO timestamp
  last_error TEXT,                     -- ISO timestamp
  error_count INTEGER DEFAULT 0,
  avg_latency_ms INTEGER,              -- rolling average fetch+parse latency
  consecutive_failures INTEGER DEFAULT 0,
  status TEXT,                         -- OK | DEGRADED | FAILING
  notes TEXT,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  UNIQUE(feed_name)
);
CREATE INDEX IF NOT EXISTS idx_feed_health_status ON feed_health(status);

-- Views (optional future): could add materialized patterns if needed
-- (SQLite D1 lacks true materialized views; skip for now)

-- Minimal seed inserts (only if empty)
INSERT INTO feed_health (feed_name, status, notes)
  SELECT 'reliefweb','OK','Initialized' WHERE NOT EXISTS(SELECT 1 FROM feed_health WHERE feed_name='reliefweb');
INSERT INTO feed_health (feed_name, status, notes)
  SELECT 'gdacs','OK','Initialized' WHERE NOT EXISTS(SELECT 1 FROM feed_health WHERE feed_name='gdacs');
INSERT INTO feed_health (feed_name, status, notes)
  SELECT 'usgs','OK','Initialized' WHERE NOT EXISTS(SELECT 1 FROM feed_health WHERE feed_name='usgs');
INSERT INTO feed_health (feed_name, status, notes)
  SELECT 'nasa_firms','OK','Initialized' WHERE NOT EXISTS(SELECT 1 FROM feed_health WHERE feed_name='nasa_firms');
INSERT INTO feed_health (feed_name, status, notes)
  SELECT 'cyclones','OK','Initialized' WHERE NOT EXISTS(SELECT 1 FROM feed_health WHERE feed_name='cyclones');
