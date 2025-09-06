-- Seed a few rows (compatible with schema where id is INTEGER and external_id is TEXT)
INSERT OR IGNORE INTO disasters (external_id, disaster_type, severity, country, coordinates_lat, coordinates_lng, title, event_timestamp)
VALUES
  ('evt-001','earthquake','RED','JP',35.6895,139.6917,'Tokyo Tremor M5.2','2025-08-01T10:00:00Z'),
  ('evt-002','flood','ORANGE','NG',6.5244,3.3792,'Lagos Lagoon Flood','2025-07-20T15:30:00Z'),
  ('evt-003','wildfire','GREEN','US',34.0522,-118.2437,'Brush Fire near LA','2025-07-10T08:15:00Z');

INSERT OR IGNORE INTO countries (code, name) VALUES
  ('US','United States'),
  ('NG','Nigeria'),
  ('JP','Japan');
