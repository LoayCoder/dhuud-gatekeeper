-- Create helper function for checking asset category management access
CREATE OR REPLACE FUNCTION public.can_manage_asset_categories(_user_id uuid)
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
    -- Check if user has direct menu access to admin_asset_categories
    SELECT 1 FROM user_menu_access uma
    JOIN menu_items mi ON uma.menu_item_id = mi.id
    WHERE uma.user_id = _user_id 
      AND mi.code = 'admin_asset_categories'
      AND uma.deleted_at IS NULL
  ) OR EXISTS (
    -- Check if user has role-based menu access to admin_asset_categories
    SELECT 1 FROM role_menu_access rma
    JOIN menu_items mi ON rma.menu_item_id = mi.id
    JOIN user_role_assignments ura ON ura.role_id = rma.role_id
    WHERE ura.user_id = _user_id AND mi.code = 'admin_asset_categories'
  );
$$;

-- Update RLS policies for asset_categories table
DROP POLICY IF EXISTS "Admins can manage asset categories" ON asset_categories;
DROP POLICY IF EXISTS "Admins can manage categories" ON asset_categories;

CREATE POLICY "Users with asset category access can manage categories"
ON asset_categories FOR ALL TO authenticated
USING (
  can_manage_asset_categories(auth.uid()) 
  AND ((tenant_id IS NULL) OR (tenant_id = get_auth_tenant_id()))
)
WITH CHECK (
  can_manage_asset_categories(auth.uid()) 
  AND ((tenant_id IS NULL) OR (tenant_id = get_auth_tenant_id()))
);

-- Update RLS policies for asset_types table
DROP POLICY IF EXISTS "Admins can manage types" ON asset_types;

CREATE POLICY "Users with asset category access can manage types"
ON asset_types FOR ALL TO authenticated
USING (
  can_manage_asset_categories(auth.uid()) 
  AND ((tenant_id IS NULL) OR (tenant_id = get_auth_tenant_id()))
)
WITH CHECK (
  can_manage_asset_categories(auth.uid()) 
  AND ((tenant_id IS NULL) OR (tenant_id = get_auth_tenant_id()))
);

-- Update RLS policies for asset_subtypes table
DROP POLICY IF EXISTS "Admins can manage subtypes" ON asset_subtypes;

CREATE POLICY "Users with asset category access can manage subtypes"
ON asset_subtypes FOR ALL TO authenticated
USING (
  can_manage_asset_categories(auth.uid()) 
  AND ((tenant_id IS NULL) OR (tenant_id = get_auth_tenant_id()))
)
WITH CHECK (
  can_manage_asset_categories(auth.uid()) 
  AND ((tenant_id IS NULL) OR (tenant_id = get_auth_tenant_id()))
);