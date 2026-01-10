-- Create a dedicated function for template access that validates tenant match directly
-- This avoids calling get_auth_tenant_id() in the USING clause which may cause issues
CREATE OR REPLACE FUNCTION public.can_manage_inspection_templates(_user_id uuid, _template_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM profiles p
    WHERE p.user_id = _user_id
      AND p.tenant_id = _template_tenant_id
      AND p.deleted_at IS NULL
  )
  AND (
    has_role(_user_id, 'admin'::app_role) 
    OR has_asset_management_access(_user_id)
  )
$$;

-- Drop and recreate the UPDATE policy with direct checks
DROP POLICY IF EXISTS "Allow update and soft-delete templates" ON public.inspection_templates;

CREATE POLICY "Allow update and soft-delete templates"
ON public.inspection_templates
FOR UPDATE
TO authenticated
USING (
  deleted_at IS NULL
  AND can_manage_inspection_templates(auth.uid(), tenant_id)
)
WITH CHECK (TRUE);

-- Force PostgREST to reload
NOTIFY pgrst, 'reload schema';