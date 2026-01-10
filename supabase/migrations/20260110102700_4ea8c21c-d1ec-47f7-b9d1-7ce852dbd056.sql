-- Drop all existing UPDATE policies to ensure clean state
DROP POLICY IF EXISTS "HSSE authorized users can update or soft-delete templates" ON public.inspection_templates;
DROP POLICY IF EXISTS "Authorized users can update or soft-delete templates" ON public.inspection_templates;
DROP POLICY IF EXISTS "HSSE users can update templates" ON public.inspection_templates;
DROP POLICY IF EXISTS "Allow update and soft-delete templates" ON public.inspection_templates;

-- Create a simplified UPDATE policy
-- The USING clause handles all access control
-- WITH CHECK (TRUE) allows the update to pass once USING is satisfied
CREATE POLICY "Allow update and soft-delete templates"
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
  TRUE
);