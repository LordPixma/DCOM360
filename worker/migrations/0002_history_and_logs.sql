-- D1 schema: history and processing logs
CREATE TABLE IF NOT EXISTS disaster_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  disaster_id INTEGER NOT NULL,
  severity_old TEXT,
  severity_new TEXT,
  affected_population_old INTEGER,
  affected_population_new INTEGER,
  changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  change_reason TEXT,
  FOREIGN KEY(disaster_id) REFERENCES disasters(id)
);

CREATE INDEX IF NOT EXISTS idx_disaster_history_changed_at ON disaster_history(changed_at);
CREATE INDEX IF NOT EXISTS idx_disaster_history_disaster ON disaster_history(disaster_id);

CREATE TABLE IF NOT EXISTS processing_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email_date DATE NOT NULL,
  processing_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  disasters_processed INTEGER DEFAULT 0,
  new_disasters INTEGER DEFAULT 0,
  updated_disasters INTEGER DEFAULT 0,
  status TEXT DEFAULT 'PROCESSING',
  error_details TEXT,
  processing_time_ms INTEGER,
  email_size_bytes INTEGER,
  raw_email_hash TEXT
);

CREATE INDEX IF NOT EXISTS idx_processing_logs_date ON processing_logs(email_date);
CREATE INDEX IF NOT EXISTS idx_processing_logs_status ON processing_logs(status);
