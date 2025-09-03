-- Optional seed for dev/testing
INSERT INTO disasters (external_id, disaster_type, severity, title, country, coordinates_lat, coordinates_lng, event_timestamp, is_active)
VALUES
 ('eq-001', 'earthquake', 'GREEN', 'M4.8 Earthquake - Testland', 'TL', 10.5, 20.6, datetime('now','-1 day'), 1),
 ('fl-001', 'flood', 'ORANGE', 'Flood in River City', 'RC', -3.2, 12.4, datetime('now','-12 hours'), 1),
 ('wf-001', 'wildfire', 'RED', 'Wildfire near Hills', 'HS', 34.1, -118.2, datetime('now','-2 hours'), 1)
ON CONFLICT(external_id) DO NOTHING;

INSERT INTO disaster_history (disaster_id, severity_old, severity_new, affected_population_old, affected_population_new, changed_at, change_reason)
SELECT id, NULL, severity, 0, affected_population, datetime('now','-30 minutes'), 'seed'
FROM disasters
WHERE external_id IN ('eq-001','fl-001','wf-001');
