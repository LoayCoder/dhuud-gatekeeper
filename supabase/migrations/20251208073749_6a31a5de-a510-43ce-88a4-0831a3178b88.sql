-- Drop the conflicting soft-delete policy we just created
DROP POLICY IF EXISTS "Admins can soft delete non-closed incidents" ON public.incidents;

-- Drop the existing HSSE update policy
DROP POLICY IF EXISTS "HSSE users can update incidents" ON public.incidents;

-- Create a unified update policy with soft-delete logic
CREATE POLICY "HSSE users can update incidents" 
ON public.incidents 
FOR UPDATE
TO authenticated
USING (
  tenant_id = get_auth_tenant_id()
  AND deleted_at IS NULL
  AND (has_hsse_incident_access(auth.uid()) OR reporter_id = auth.uid())
)
WITH CHECK (
  tenant_id = get_auth_tenant_id()
  AND (
    -- Normal updates: deleted_at stays NULL
    (deleted_at IS NULL)
    OR
    -- Soft-delete: only admin + non-closed
    (deleted_at IS NOT NULL AND is_admin(auth.uid()) AND status != 'closed')
  )
);