-- Fix infinite recursion in profiles RLS policies
-- The issue is that some policies query the profiles table itself, causing recursion

-- Drop the problematic policy that has a direct self-reference
DROP POLICY IF EXISTS "Managers can view department profiles" ON profiles;

-- Drop existing policies that may cause recursion through functions that query profiles
DROP POLICY IF EXISTS "Admins can view all profiles in tenant" ON profiles;
DROP POLICY IF EXISTS "HSSE Managers can view all profiles in tenant" ON profiles;

-- Create a security definer function that bypasses RLS to safely get tenant_id for comparison
CREATE OR REPLACE FUNCTION get_profile_tenant_id_bypass(p_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT tenant_id FROM profiles WHERE id = p_user_id
$$;

-- Create a security definer function to get department_id bypassing RLS
CREATE OR REPLACE FUNCTION get_profile_department_id_bypass(p_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT assigned_department_id FROM profiles WHERE id = p_user_id
$$;

-- Recreate policies without recursion using the bypass functions
CREATE POLICY "Admins can view all profiles in tenant"
ON profiles FOR SELECT
USING (
  tenant_id = get_profile_tenant_id_bypass(auth.uid())
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "HSSE Managers can view all profiles in tenant"
ON profiles FOR SELECT
USING (
  tenant_id = get_profile_tenant_id_bypass(auth.uid())
  AND has_role_by_code(auth.uid(), 'hsse_manager')
);

CREATE POLICY "Managers can view department profiles"
ON profiles FOR SELECT
USING (
  tenant_id = get_profile_tenant_id_bypass(auth.uid())
  AND has_role_by_code(auth.uid(), 'manager')
  AND assigned_department_id = get_profile_department_id_bypass(auth.uid())
);