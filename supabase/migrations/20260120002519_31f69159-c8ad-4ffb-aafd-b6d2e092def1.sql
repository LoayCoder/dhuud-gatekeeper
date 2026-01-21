-- Fix RLS policies on asset_type_parts to use get_auth_tenant_id() instead of broken JWT app_metadata

-- 1. Drop existing policies
DROP POLICY IF EXISTS "Users can view parts for their tenant" ON asset_type_parts;
DROP POLICY IF EXISTS "Users can insert parts for their tenant" ON asset_type_parts;
DROP POLICY IF EXISTS "Users can update parts for their tenant" ON asset_type_parts;
DROP POLICY IF EXISTS "Users can delete parts for their tenant" ON asset_type_parts;

-- 2. Recreate SELECT policy (allow tenant parts + system parts where tenant_id IS NULL)
CREATE POLICY "Users can view parts for their tenant"
ON asset_type_parts FOR SELECT
USING (
  deleted_at IS NULL 
  AND (tenant_id IS NULL OR tenant_id = get_auth_tenant_id())
);

-- 3. Recreate INSERT policy (tenant-scoped only)
CREATE POLICY "Users can insert parts for their tenant"
ON asset_type_parts FOR INSERT
WITH CHECK (
  tenant_id = get_auth_tenant_id()
);

-- 4. Recreate UPDATE policy (tenant-scoped only)
CREATE POLICY "Users can update parts for their tenant"
ON asset_type_parts FOR UPDATE
USING (tenant_id = get_auth_tenant_id())
WITH CHECK (tenant_id = get_auth_tenant_id());

-- 5. Recreate DELETE policy (soft delete - tenant-scoped only)
CREATE POLICY "Users can delete parts for their tenant"
ON asset_type_parts FOR DELETE
USING (tenant_id = get_auth_tenant_id());