-- Force refresh of the UPDATE policy by dropping and recreating
DROP POLICY IF EXISTS "Authorized users can update or soft-delete templates" ON public.inspection_templates;

-- Create the new policy with a fresh definition
CREATE POLICY "HSSE authorized users can update or soft-delete templates"
ON public.inspection_templates
FOR UPDATE
TO authenticated  -- Explicitly scope to authenticated role
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