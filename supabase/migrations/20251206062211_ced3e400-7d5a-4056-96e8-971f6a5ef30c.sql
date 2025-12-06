-- Fix UPDATE policy to allow soft deletes by adding explicit WITH CHECK clause
DROP POLICY IF EXISTS "HSSE users can update evidence during investigation" ON evidence_items;

CREATE POLICY "HSSE users can update evidence during investigation"
ON evidence_items FOR UPDATE 
USING (
  tenant_id = get_auth_tenant_id() 
  AND deleted_at IS NULL
  AND has_hsse_incident_access(auth.uid()) 
  AND is_incident_editable(incident_id)
)
WITH CHECK (
  tenant_id = get_auth_tenant_id() 
  AND has_hsse_incident_access(auth.uid()) 
  AND is_incident_editable(incident_id)
);