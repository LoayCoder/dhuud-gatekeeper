-- Drop the existing UPDATE policy
DROP POLICY IF EXISTS "HSSE, assigned or investigator can update corrective actions" ON corrective_actions;

-- Create fixed UPDATE policy with explicit soft-delete support
-- USING: checks existing row (must not be already deleted)
-- WITH CHECK: checks new row (no deleted_at restriction, allowing soft delete)
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