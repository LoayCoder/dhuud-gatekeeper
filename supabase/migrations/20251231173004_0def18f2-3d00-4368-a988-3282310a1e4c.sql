-- Backfill incidents with department_id from reporter's profile
UPDATE incidents i
SET department_id = (
  SELECT p.assigned_department_id 
  FROM profiles p 
  WHERE p.id = i.reporter_id 
    AND p.assigned_department_id IS NOT NULL
)
WHERE i.department_id IS NULL
  AND i.reporter_id IS NOT NULL
  AND i.deleted_at IS NULL;