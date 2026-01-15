-- Create role_menu_permissions table for CRUD permissions per role per menu
CREATE TABLE public.role_menu_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE NOT NULL,
  menu_code TEXT NOT NULL,
  can_create BOOLEAN DEFAULT false,
  can_read BOOLEAN DEFAULT true,
  can_update BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ DEFAULT NULL,
  
  UNIQUE(tenant_id, role_id, menu_code)
);

-- Enable RLS
ALTER TABLE public.role_menu_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policy for tenant isolation
CREATE POLICY "Tenant isolation for role_menu_permissions"
ON public.role_menu_permissions
FOR ALL
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_role_menu_permissions_updated_at
  BEFORE UPDATE ON public.role_menu_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed Admin role: Full CRUD access to all admin menus
INSERT INTO public.role_menu_permissions (tenant_id, role_id, menu_code, can_create, can_read, can_update, can_delete)
SELECT DISTINCT
  p.tenant_id,
  r.id as role_id,
  mi.code as menu_code,
  true, true, true, true
FROM public.profiles p
CROSS JOIN public.roles r
CROSS JOIN public.menu_items mi
WHERE r.code = 'admin'
  AND mi.code LIKE 'admin_%'
  AND r.is_active = true
ON CONFLICT (tenant_id, role_id, menu_code) DO NOTHING;

-- Seed Data Entry role: Create, Read, Update (no Delete) on admin menus
INSERT INTO public.role_menu_permissions (tenant_id, role_id, menu_code, can_create, can_read, can_update, can_delete)
SELECT DISTINCT
  p.tenant_id,
  r.id as role_id,
  mi.code as menu_code,
  true,  -- can_create
  true,  -- can_read
  true,  -- can_update
  false  -- can_delete (NO delete for data entry)
FROM public.profiles p
CROSS JOIN public.roles r
CROSS JOIN public.menu_items mi
WHERE r.code = 'data_entry'
  AND mi.code LIKE 'admin_%'
  AND r.is_active = true
ON CONFLICT (tenant_id, role_id, menu_code) DO NOTHING;

-- Create function to get user menu permissions (combines all user roles)
CREATE OR REPLACE FUNCTION public.get_user_menu_permissions(_user_id UUID, _menu_code TEXT)
RETURNS TABLE (
  can_create BOOLEAN,
  can_read BOOLEAN,
  can_update BOOLEAN,
  can_delete BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Check if user is admin first (full access)
  WITH is_admin AS (
    SELECT EXISTS (
      SELECT 1 FROM public.user_role_assignments ura
      JOIN public.roles r ON r.id = ura.role_id
      WHERE ura.user_id = _user_id 
        AND r.code = 'admin'
        AND r.is_active = true
    ) as admin_access
  ),
  -- Get combined permissions from all user roles
  combined_perms AS (
    SELECT 
      COALESCE(bool_or(rmp.can_create), false) as can_create,
      COALESCE(bool_or(rmp.can_read), true) as can_read,
      COALESCE(bool_or(rmp.can_update), false) as can_update,
      COALESCE(bool_or(rmp.can_delete), false) as can_delete
    FROM public.user_role_assignments ura
    JOIN public.role_menu_permissions rmp ON rmp.role_id = ura.role_id
    WHERE ura.user_id = _user_id
      AND rmp.menu_code = _menu_code
      AND rmp.deleted_at IS NULL
  )
  SELECT 
    CASE WHEN (SELECT admin_access FROM is_admin) THEN true
         ELSE COALESCE((SELECT can_create FROM combined_perms), false) END,
    CASE WHEN (SELECT admin_access FROM is_admin) THEN true
         ELSE COALESCE((SELECT can_read FROM combined_perms), true) END,
    CASE WHEN (SELECT admin_access FROM is_admin) THEN true
         ELSE COALESCE((SELECT can_update FROM combined_perms), false) END,
    CASE WHEN (SELECT admin_access FROM is_admin) THEN true
         ELSE COALESCE((SELECT can_delete FROM combined_perms), false) END;
$$;