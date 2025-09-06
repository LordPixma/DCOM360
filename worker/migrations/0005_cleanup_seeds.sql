-- Cleanup historical demo/seed data so only real ingest remains
PRAGMA foreign_keys=ON;

-- Remove dev seed disasters by external_id (new schema)
DELETE FROM disaster_history WHERE disaster_id IN (
  SELECT id FROM disasters WHERE external_id IN ('eq-001','fl-001','wf-001')
);
DELETE FROM disasters WHERE external_id IN ('eq-001','fl-001','wf-001');

-- Remove earlier seed disasters by title (legacy seeds)
DELETE FROM disaster_history WHERE disaster_id IN (
  SELECT id FROM disasters WHERE title IN (
    'Tokyo Tremor M5.2','Lagos Lagoon Flood','Brush Fire near LA'
  )
);
DELETE FROM disasters WHERE title IN (
  'Tokyo Tremor M5.2','Lagos Lagoon Flood','Brush Fire near LA'
);

-- Keep countries; do not delete standard ISO codes in production

-- Tidy any placeholder processing logs left in PROCESSING state
DELETE FROM processing_logs WHERE status = 'PROCESSING';

-- This migration is safe to run multiple times.
