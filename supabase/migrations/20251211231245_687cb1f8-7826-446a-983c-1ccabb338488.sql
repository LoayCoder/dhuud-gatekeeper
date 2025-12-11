-- Add a simple policy that allows users to read their own profile by ID only
-- This breaks the circular dependency in get_auth_tenant_id()
-- When get_auth_tenant_id() runs: SELECT tenant_id FROM profiles WHERE id = auth.uid()
-- This policy matches immediately without needing to call get_auth_tenant_id() first

CREATE POLICY "Users can read own profile by id"
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());