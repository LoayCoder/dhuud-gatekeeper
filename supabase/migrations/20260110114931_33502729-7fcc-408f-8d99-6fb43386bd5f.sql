-- Fix inspection_templates INSERT policy that still has broken WITH CHECK
-- The INSERT policy requires tenant_id = get_auth_tenant_id() which fails when function returns NULL

-- Drop the problematic INSERT policy
DROP POLICY IF EXISTS "HSSE users can create templates" ON public.inspection_templates;

-- Recreate with a safer approach - check tenant_id matches user's tenant OR is provided correctly
CREATE POLICY "HSSE users can create templates"
ON public.inspection_templates
FOR INSERT
TO authenticated
WITH CHECK (
  has_asset_management_access(auth.uid())
  AND tenant_id IN (SELECT tenant_id FROM profiles WHERE user_id = auth.uid() AND is_deleted = FALSE)
);

-- Also fix the DELETE policy that uses get_auth_tenant_id()
DROP POLICY IF EXISTS "Admins can delete templates" ON public.inspection_templates;

CREATE POLICY "Admins can delete templates"
ON public.inspection_templates
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND tenant_id IN (SELECT tenant_id FROM profiles WHERE user_id = auth.uid() AND is_deleted = FALSE)
);

-- Fix the SELECT policy
DROP POLICY IF EXISTS "Users can view templates in their tenant" ON public.inspection_templates;

CREATE POLICY "Users can view templates in their tenant"
ON public.inspection_templates
FOR SELECT
TO authenticated
USING (
  deleted_at IS NULL
  AND tenant_id IN (SELECT tenant_id FROM profiles WHERE user_id = auth.uid() AND is_deleted = FALSE)
);

-- Fix the UPDATE policy to also use subquery instead of function
DROP POLICY IF EXISTS "Allow template updates" ON public.inspection_templates;

CREATE POLICY "Allow template updates"
ON public.inspection_templates
FOR UPDATE
TO authenticated
USING (
  tenant_id IN (SELECT tenant_id FROM profiles WHERE user_id = auth.uid() AND is_deleted = FALSE)
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_asset_management_access(auth.uid()))
)
WITH CHECK (TRUE);

-- Force schema reload
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';