-- Fix incidents with NULL reporter_id by assigning to tenant admin
UPDATE incidents 
SET reporter_id = (
  SELECT p.id FROM profiles p
  WHERE p.tenant_id = incidents.tenant_id 
  AND p.deleted_at IS NULL
  AND EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = p.id AND ur.role = 'admin'
  )
  LIMIT 1
)
WHERE reporter_id IS NULL 
AND deleted_at IS NULL;