-- Create helper function for checking org structure management access
CREATE OR REPLACE FUNCTION public.can_manage_org_structure(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    -- Check if user is super admin
    SELECT 1 FROM profiles p WHERE p.user_id = _user_id AND p.is_super_admin = true
  ) OR EXISTS (
    -- Check if user has admin role
    SELECT 1 FROM user_role_assignments ura 
    JOIN roles r ON ura.role_id = r.id 
    WHERE ura.user_id = _user_id AND r.code = 'admin'
  ) OR EXISTS (
    -- Check if user has data_entry role
    SELECT 1 FROM user_role_assignments ura
    JOIN roles r ON ura.role_id = r.id
    WHERE ura.user_id = _user_id AND r.code = 'data_entry'
  ) OR EXISTS (
    -- Check if user has direct menu access to admin_org
    SELECT 1 FROM user_menu_access uma
    JOIN menu_items mi ON uma.menu_item_id = mi.id
    WHERE uma.user_id = _user_id 
      AND mi.code = 'admin_org'
      AND uma.deleted_at IS NULL
  ) OR EXISTS (
    -- Check if user has role-based menu access to admin_org
    SELECT 1 FROM role_menu_access rma
    JOIN menu_items mi ON rma.menu_item_id = mi.id
    JOIN user_role_assignments ura ON ura.role_id = rma.role_id
    WHERE ura.user_id = _user_id AND mi.code = 'admin_org'
  );
$$;

-- Update RLS policies for buildings table
DROP POLICY IF EXISTS "Admins can manage buildings" ON buildings;

CREATE POLICY "Users with org structure access can manage buildings"
ON buildings FOR ALL TO authenticated
USING (
  can_manage_org_structure(auth.uid()) 
  AND (tenant_id = get_auth_tenant_id())
)
WITH CHECK (
  can_manage_org_structure(auth.uid()) 
  AND (tenant_id = get_auth_tenant_id())
);

-- Update RLS policies for floors_zones table
DROP POLICY IF EXISTS "Admins can manage floors" ON floors_zones;

CREATE POLICY "Users with org structure access can manage floors_zones"
ON floors_zones FOR ALL TO authenticated
USING (
  can_manage_org_structure(auth.uid()) 
  AND (tenant_id = get_auth_tenant_id())
)
WITH CHECK (
  can_manage_org_structure(auth.uid()) 
  AND (tenant_id = get_auth_tenant_id())
);