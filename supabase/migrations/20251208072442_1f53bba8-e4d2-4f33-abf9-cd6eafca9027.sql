-- Create helper function to check if admin can delete incident (non-closed only)
CREATE OR REPLACE FUNCTION public.can_admin_delete_incident(_incident_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.incidents
    WHERE id = _incident_id
      AND tenant_id = get_auth_tenant_id()
      AND status != 'closed'
      AND deleted_at IS NULL
  ) AND is_admin(auth.uid())
$$;

-- Drop existing admin delete policy if exists
DROP POLICY IF EXISTS "Admins can delete incidents" ON public.incidents;

-- Create new policy: Only admins can soft-delete non-closed incidents
CREATE POLICY "Admins can soft delete non-closed incidents" 
ON public.incidents 
FOR UPDATE
TO authenticated
USING (
  is_admin(auth.uid()) 
  AND tenant_id = get_auth_tenant_id()
  AND deleted_at IS NULL
  AND status != 'closed'
)
WITH CHECK (
  is_admin(auth.uid()) 
  AND tenant_id = get_auth_tenant_id()
  AND deleted_at IS NOT NULL
  AND status != 'closed'
);