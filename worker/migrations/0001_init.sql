-- D1 modern schema
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS disasters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  external_id TEXT UNIQUE,
  disaster_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('RED','ORANGE','GREEN')),
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  country TEXT,
  coordinates_lat REAL,
  coordinates_lng REAL,
  magnitude REAL,
  wind_speed INTEGER,
  depth_km REAL,
  affected_population INTEGER DEFAULT 0,
  affected_radius_km INTEGER DEFAULT 0,
  event_timestamp DATETIME NOT NULL,
  is_active INTEGER DEFAULT 1,
  metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Optimized compound indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_disasters_active_timestamp ON disasters(is_active, event_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_disasters_active_severity ON disasters(is_active, severity);
CREATE INDEX IF NOT EXISTS idx_disasters_active_type ON disasters(is_active, disaster_type);
CREATE INDEX IF NOT EXISTS idx_disasters_active_country ON disasters(is_active, country);
CREATE INDEX IF NOT EXISTS idx_disasters_external_id ON disasters(external_id);

-- Countries lookup table
CREATE TABLE IF NOT EXISTS countries (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL
);
