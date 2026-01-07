-- Fix UPDATE RLS policy for soft-delete operations
-- The current policy blocks soft-deletes because of the deleted_at IS NULL condition in WITH CHECK

-- Drop the problematic existing policy
DROP POLICY IF EXISTS "Asset managers can update assets" ON public.hsse_assets;

-- Create new policy that allows soft-delete operations
-- USING: Only allow updates on non-deleted assets belonging to tenant
-- WITH CHECK: Allow the update to complete (including setting deleted_at)
CREATE POLICY "Asset managers can update assets" 
ON public.hsse_assets 
FOR UPDATE 
USING (
  tenant_id = get_auth_tenant_id() 
  AND deleted_at IS NULL 
  AND has_asset_management_access(auth.uid())
)
WITH CHECK (
  tenant_id = get_auth_tenant_id()
  AND has_asset_management_access(auth.uid())
);