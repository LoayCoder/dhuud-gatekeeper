-- =====================================================
-- FIX: Simplified RLS Policies for inspection_templates
-- Addresses soft-delete RLS conflict by removing deleted_at check from UPDATE
-- =====================================================

-- 1. Drop ALL existing policies (including the ones just created)
DROP POLICY IF EXISTS "Users can view templates in their tenant" ON public.inspection_templates;
DROP POLICY IF EXISTS "HSSE users can create templates" ON public.inspection_templates;
DROP POLICY IF EXISTS "Allow template updates" ON public.inspection_templates;
DROP POLICY IF EXISTS "Admins can delete templates" ON public.inspection_templates;
DROP POLICY IF EXISTS "tenant_select_templates" ON public.inspection_templates;
DROP POLICY IF EXISTS "tenant_insert_templates" ON public.inspection_templates;
DROP POLICY IF EXISTS "tenant_update_templates" ON public.inspection_templates;
DROP POLICY IF EXISTS "tenant_delete_templates" ON public.inspection_templates;

-- 2. SELECT policy - Only show non-deleted templates in tenant
CREATE POLICY "tenant_select_templates"
ON public.inspection_templates
FOR SELECT
TO authenticated
USING (
  tenant_id = get_auth_tenant_id_bypass()
  AND deleted_at IS NULL
);

-- 3. INSERT policy - Users can create templates for their tenant
CREATE POLICY "tenant_insert_templates"
ON public.inspection_templates
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id = get_auth_tenant_id_bypass()
);

-- 4. UPDATE policy - THE KEY FIX
-- USING: Must match tenant (NO deleted_at check - allows soft-delete!)
-- WITH CHECK: Just verify tenant stays the same
CREATE POLICY "tenant_update_templates"
ON public.inspection_templates
FOR UPDATE
TO authenticated
USING (
  tenant_id = get_auth_tenant_id_bypass()
)
WITH CHECK (
  tenant_id = get_auth_tenant_id_bypass()
);

-- 5. DELETE policy (hard delete - admin only)
CREATE POLICY "tenant_delete_templates"
ON public.inspection_templates
FOR DELETE
TO authenticated
USING (
  tenant_id = get_auth_tenant_id_bypass()
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Force PostgREST to reload
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';