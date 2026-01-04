-- Allow HSSE users to view contractor companies for incident-related access
CREATE POLICY "HSSE users can view contractor companies"
ON public.contractor_companies FOR SELECT
USING (
  tenant_id = get_auth_tenant_id() 
  AND deleted_at IS NULL 
  AND has_hsse_incident_access(auth.uid())
);

-- Allow Contract Controllers to view contractor companies for violation approval
CREATE POLICY "Contract controllers can view contractor companies"
ON public.contractor_companies FOR SELECT
USING (
  tenant_id = get_auth_tenant_id() 
  AND deleted_at IS NULL 
  AND has_role_by_code(auth.uid(), 'contract_controller')
);

-- Allow HSSE users to view contractor projects for incident-related access
CREATE POLICY "HSSE users can view contractor projects"
ON public.contractor_projects FOR SELECT
USING (
  tenant_id = get_auth_tenant_id() 
  AND deleted_at IS NULL 
  AND has_hsse_incident_access(auth.uid())
);

-- Allow Contract Controllers to view contractor projects
CREATE POLICY "Contract controllers can view contractor projects"
ON public.contractor_projects FOR SELECT
USING (
  tenant_id = get_auth_tenant_id() 
  AND deleted_at IS NULL 
  AND has_role_by_code(auth.uid(), 'contract_controller')
);