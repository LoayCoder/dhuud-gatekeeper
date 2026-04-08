-- Drop existing policies
DROP POLICY IF EXISTS "Tenant isolation for site_clearance_risks" ON public.site_clearance_risks;
DROP POLICY IF EXISTS "Tenant members can create risks" ON public.site_clearance_risks;
DROP POLICY IF EXISTS "Tenant members can update risks" ON public.site_clearance_risks;

-- Recreate with bypass function
CREATE POLICY "Tenant isolation for site_clearance_risks"
ON public.site_clearance_risks FOR SELECT TO authenticated
USING (tenant_id = public.get_auth_tenant_id_bypass() AND deleted_at IS NULL);

CREATE POLICY "Tenant members can create risks"
ON public.site_clearance_risks FOR INSERT TO authenticated
WITH CHECK (tenant_id = public.get_auth_tenant_id_bypass());

CREATE POLICY "Tenant members can update risks"
ON public.site_clearance_risks FOR UPDATE TO authenticated
USING (tenant_id = public.get_auth_tenant_id_bypass())
WITH CHECK (tenant_id = public.get_auth_tenant_id_bypass());