DROP POLICY IF EXISTS "Tenant members can update risks" ON public.site_clearance_risks;

CREATE POLICY "Tenant members can update risks"
ON public.site_clearance_risks FOR UPDATE TO authenticated
USING (tenant_id = public.get_auth_tenant_id_bypass())
WITH CHECK (tenant_id = public.get_auth_tenant_id_bypass());