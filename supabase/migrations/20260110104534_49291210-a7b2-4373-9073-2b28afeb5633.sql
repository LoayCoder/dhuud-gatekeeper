-- Force PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

-- Drop and recreate to force cache invalidation
DROP POLICY IF EXISTS "Allow update and soft-delete templates" ON public.inspection_templates;

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
WITH CHECK (TRUE);