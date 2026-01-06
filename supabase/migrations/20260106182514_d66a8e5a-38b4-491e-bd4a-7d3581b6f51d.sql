-- Create safe helper function to check admin status (bypasses RLS to avoid recursion)
CREATE OR REPLACE FUNCTION public.is_admin_safe(check_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN roles r ON ura.role_id = r.id
    WHERE ura.user_id = check_user_id 
      AND r.code = 'admin'
  );
$$;

-- Drop the problematic recursive policies
DROP POLICY IF EXISTS "Admins can manage role assignments in tenant" ON user_role_assignments;
DROP POLICY IF EXISTS "Admins can view all role assignments in tenant" ON user_role_assignments;

-- Create safe replacement policy for viewing
CREATE POLICY "Admins can view role assignments in tenant" ON user_role_assignments
  FOR SELECT USING (
    tenant_id = public.get_auth_tenant_id() 
    AND public.is_admin_safe(auth.uid())
  );

-- Create safe replacement policy for INSERT
CREATE POLICY "Admins can insert role assignments in tenant" ON user_role_assignments
  FOR INSERT WITH CHECK (
    tenant_id = public.get_auth_tenant_id() 
    AND public.is_admin_safe(auth.uid())
  );

-- Create safe replacement policy for UPDATE
CREATE POLICY "Admins can update role assignments in tenant" ON user_role_assignments
  FOR UPDATE USING (
    tenant_id = public.get_auth_tenant_id() 
    AND public.is_admin_safe(auth.uid())
  )
  WITH CHECK (
    tenant_id = public.get_auth_tenant_id() 
    AND public.is_admin_safe(auth.uid())
  );

-- Create safe replacement policy for DELETE
CREATE POLICY "Admins can delete role assignments in tenant" ON user_role_assignments
  FOR DELETE USING (
    tenant_id = public.get_auth_tenant_id() 
    AND public.is_admin_safe(auth.uid())
  );