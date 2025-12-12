-- Fix INC-2025-0003 data inconsistency: set started_at for investigations
-- where incident is in pending_closure but started_at is NULL
UPDATE investigations
SET started_at = COALESCE(started_at, created_at)
WHERE incident_id = '5a22bd20-f122-4ac9-8a74-cdf7d1b594c1'
  AND started_at IS NULL
  AND deleted_at IS NULL;