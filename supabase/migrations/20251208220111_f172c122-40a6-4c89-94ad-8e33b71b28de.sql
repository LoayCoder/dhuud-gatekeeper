-- Fix RLS policies for admin user creation
-- Allow admins to insert profiles for users in their tenant

CREATE POLICY "Admins can insert profiles for their tenant"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  AND tenant_id = get_auth_tenant_id()
);

-- Allow admins to update profiles in their tenant
CREATE POLICY "Admins can update profiles in their tenant"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND tenant_id = get_auth_tenant_id()
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  AND tenant_id = get_auth_tenant_id()
);