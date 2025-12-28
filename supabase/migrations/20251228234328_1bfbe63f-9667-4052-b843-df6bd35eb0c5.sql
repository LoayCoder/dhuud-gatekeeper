-- Drop the problematic policy causing infinite recursion
DROP POLICY IF EXISTS "profiles_tenant_scoped_access" ON public.profiles;

-- Create a simpler SELECT policy that doesn't cause recursion
-- Users can always see their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (id = auth.uid());

-- Create a separate policy for admins/managers to view profiles in their tenant
-- This uses SECURITY DEFINER function to bypass RLS during the tenant check
CREATE OR REPLACE FUNCTION public.get_user_tenant_id_secure(p_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT tenant_id FROM profiles WHERE id = p_user_id;
$$;

-- Admins can view all profiles in their tenant
CREATE POLICY "Admins can view all profiles in tenant"
ON public.profiles
FOR SELECT
USING (
  tenant_id = get_user_tenant_id_secure(auth.uid())
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- HSSE Managers can view all profiles in their tenant
CREATE POLICY "HSSE Managers can view all profiles in tenant"
ON public.profiles
FOR SELECT
USING (
  tenant_id = get_user_tenant_id_secure(auth.uid())
  AND has_role_by_code(auth.uid(), 'hsse_manager')
);

-- Managers can view profiles in their department
CREATE POLICY "Managers can view department profiles"
ON public.profiles
FOR SELECT
USING (
  tenant_id = get_user_tenant_id_secure(auth.uid())
  AND has_role_by_code(auth.uid(), 'manager')
  AND assigned_department_id IN (
    SELECT p.assigned_department_id 
    FROM profiles p 
    WHERE p.id = auth.uid()
  )
);