-- Allow HSSE users to view contractor representatives for incident-related access
CREATE POLICY "HSSE users can view contractor representatives"
ON public.contractor_representatives FOR SELECT
USING (
  tenant_id = get_auth_tenant_id() 
  AND deleted_at IS NULL 
  AND has_hsse_incident_access(auth.uid())
);

-- Allow Contract Controllers to view contractor representatives
CREATE POLICY "Contract controllers can view contractor representatives"
ON public.contractor_representatives FOR SELECT
USING (
  tenant_id = get_auth_tenant_id() 
  AND deleted_at IS NULL 
  AND has_role_by_code(auth.uid(), 'contract_controller')
);