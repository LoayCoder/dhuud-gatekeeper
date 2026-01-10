-- Step 1: Drop ALL existing UPDATE policies to ensure clean slate
DROP POLICY IF EXISTS "Allow update and soft-delete templates" ON public.inspection_templates;
DROP POLICY IF EXISTS "Allow update templates" ON public.inspection_templates;
DROP POLICY IF EXISTS "update_inspection_templates" ON public.inspection_templates;

-- Step 2: Create a maximally simple UPDATE policy
CREATE POLICY "Allow template updates"
ON public.inspection_templates
FOR UPDATE
TO authenticated
USING (
  tenant_id = get_auth_tenant_id()
  AND deleted_at IS NULL
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_asset_management_access(auth.uid())
  )
)
WITH CHECK (
  tenant_id = get_auth_tenant_id()
);

-- Step 3: Force PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';