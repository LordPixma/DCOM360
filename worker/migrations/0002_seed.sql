-- Seed a few rows without specifying id/external_id so it works across schema variants
INSERT OR IGNORE INTO disasters (disaster_type, severity, country, coordinates_lat, coordinates_lng, title, event_timestamp)
VALUES
  ('earthquake','RED','JP',35.6895,139.6917,'Tokyo Tremor M5.2','2025-08-01T10:00:00Z'),
  ('flood','ORANGE','NG',6.5244,3.3792,'Lagos Lagoon Flood','2025-07-20T15:30:00Z'),
  ('wildfire','GREEN','US',34.0522,-118.2437,'Brush Fire near LA','2025-07-10T08:15:00Z');

INSERT OR IGNORE INTO countries (code, name) VALUES
  ('US','United States'),
  ('NG','Nigeria'),
  ('JP','Japan');
