-- D1 initial schema: disasters
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

CREATE INDEX IF NOT EXISTS idx_disasters_active ON disasters(is_active);
CREATE INDEX IF NOT EXISTS idx_disasters_event_time ON disasters(event_timestamp);
CREATE INDEX IF NOT EXISTS idx_disasters_severity ON disasters(severity);
CREATE INDEX IF NOT EXISTS idx_disasters_type ON disasters(disaster_type);
CREATE INDEX IF NOT EXISTS idx_disasters_country ON disasters(country);
