-- Fix RLS policy for soft delete on inspection_templates
-- The existing policy uses NULL WITH CHECK, which reuses USING clause and blocks soft deletes

-- Drop the existing overly restrictive policy
DROP POLICY IF EXISTS "HSSE users can update templates" ON public.inspection_templates;

-- Create a new comprehensive UPDATE policy that allows soft deletes
CREATE POLICY "Authorized users can update or soft-delete templates"
ON public.inspection_templates
FOR UPDATE
USING (
  -- Row must belong to user's tenant
  tenant_id = get_auth_tenant_id() 
  -- Row must not already be deleted
  AND deleted_at IS NULL 
  -- User must have proper access (admin OR asset management access)
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_asset_management_access(auth.uid())
  )
)
WITH CHECK (
  -- Only check tenant isolation, allow any other field changes including deleted_at
  tenant_id = get_auth_tenant_id()
);