-- Optional seed for dev/testing (aligned with current schema)
INSERT OR IGNORE INTO disasters (id, disaster_type, severity, title, country, coordinates_lat, coordinates_lng, event_timestamp, is_active)
VALUES
 ('eq-001', 'earthquake', 'GREEN', 'M4.8 Earthquake - Testland', 'TL', 10.5, 20.6, datetime('now','-1 day'), 1),
 ('fl-001', 'flood', 'ORANGE', 'Flood in River City', 'RC', -3.2, 12.4, datetime('now','-12 hours'), 1),
 ('wf-001', 'wildfire', 'RED', 'Wildfire near Hills', 'HS', 34.1, -118.2, datetime('now','-2 hours'), 1);

