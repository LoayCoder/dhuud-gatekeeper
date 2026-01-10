-- Fix all inspection_templates RLS policies to use get_auth_tenant_id_bypass()
-- This SQL function is more reliable in RLS context than the PL/pgSQL version

-- 1. Fix SELECT policy
DROP POLICY IF EXISTS "Users can view templates in their tenant" ON public.inspection_templates;
CREATE POLICY "Users can view templates in their tenant"
ON public.inspection_templates
FOR SELECT
TO authenticated
USING (
  deleted_at IS NULL
  AND tenant_id = get_auth_tenant_id_bypass()
);

-- 2. Fix INSERT policy
DROP POLICY IF EXISTS "HSSE users can create templates" ON public.inspection_templates;
CREATE POLICY "HSSE users can create templates"
ON public.inspection_templates
FOR INSERT
TO authenticated
WITH CHECK (
  has_asset_management_access(auth.uid())
  AND tenant_id = get_auth_tenant_id_bypass()
);

-- 3. Fix UPDATE policy
DROP POLICY IF EXISTS "Allow template updates" ON public.inspection_templates;
CREATE POLICY "Allow template updates"
ON public.inspection_templates
FOR UPDATE
TO authenticated
USING (
  tenant_id = get_auth_tenant_id_bypass()
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_asset_management_access(auth.uid()))
)
WITH CHECK (TRUE);

-- 4. Fix DELETE policy
DROP POLICY IF EXISTS "Admins can delete templates" ON public.inspection_templates;
CREATE POLICY "Admins can delete templates"
ON public.inspection_templates
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND tenant_id = get_auth_tenant_id_bypass()
);

-- Force PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';