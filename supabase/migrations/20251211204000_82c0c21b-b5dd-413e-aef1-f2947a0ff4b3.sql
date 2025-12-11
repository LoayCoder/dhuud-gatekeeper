-- Allow all authenticated users to view profiles within their tenant
-- This enables investigators to see reporter information, action assignees to be visible, etc.
CREATE POLICY "Users can view profiles in their tenant"
ON public.profiles
FOR SELECT
TO authenticated
USING (tenant_id = get_auth_tenant_id());