-- Drop existing unified UPDATE policy
DROP POLICY IF EXISTS "HSSE users can update incidents" ON public.incidents;

-- 1. Create policy for NORMAL updates (non-delete operations)
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
  AND deleted_at IS NULL
);

-- 2. Create SEPARATE policy for admin soft-delete
CREATE POLICY "Admins can soft delete non-closed incidents" 
ON public.incidents 
FOR UPDATE
TO authenticated
USING (
  tenant_id = get_auth_tenant_id()
  AND deleted_at IS NULL
  AND is_admin(auth.uid())
  AND status != 'closed'
)
WITH CHECK (
  tenant_id = get_auth_tenant_id()
  AND deleted_at IS NOT NULL
  AND is_admin(auth.uid())
);