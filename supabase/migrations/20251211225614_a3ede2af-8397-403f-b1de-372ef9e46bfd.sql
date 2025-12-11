-- Drop existing UPDATE policy
DROP POLICY IF EXISTS "HSSE or assigned users can update corrective actions" ON corrective_actions;

-- Create improved UPDATE policy that includes:
-- 1. HSSE users
-- 2. Assigned action owner
-- 3. Assigned investigator of the incident
CREATE POLICY "HSSE, assigned or investigator can update corrective actions"
ON corrective_actions
FOR UPDATE
TO authenticated
USING (
  tenant_id = get_auth_tenant_id()
  AND deleted_at IS NULL
  AND (
    has_hsse_incident_access(auth.uid())
    OR assigned_to = auth.uid()
    OR EXISTS (
      SELECT 1 FROM investigations i
      WHERE i.incident_id = corrective_actions.incident_id
      AND i.investigator_id = auth.uid()
      AND i.deleted_at IS NULL
    )
  )
)
WITH CHECK (
  tenant_id = get_auth_tenant_id()
  AND (
    has_hsse_incident_access(auth.uid())
    OR assigned_to = auth.uid()
    OR EXISTS (
      SELECT 1 FROM investigations i
      WHERE i.incident_id = corrective_actions.incident_id
      AND i.investigator_id = auth.uid()
      AND i.deleted_at IS NULL
    )
  )
);