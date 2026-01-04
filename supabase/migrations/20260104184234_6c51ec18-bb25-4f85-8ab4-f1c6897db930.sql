-- Create user_menu_access table for user-specific menu overrides
CREATE TABLE public.user_menu_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  menu_item_id uuid NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  granted_by uuid,
  granted_at timestamptz DEFAULT now(),
  notes text,
  deleted_at timestamptz,
  UNIQUE(tenant_id, user_id, menu_item_id)
);

-- Create index for performance
CREATE INDEX idx_user_menu_access_user_id ON public.user_menu_access(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_user_menu_access_tenant_id ON public.user_menu_access(tenant_id) WHERE deleted_at IS NULL;

-- Enable RLS
ALTER TABLE public.user_menu_access ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Tenant isolation for user_menu_access"
ON public.user_menu_access
FOR ALL
USING (tenant_id = public.get_auth_tenant_id());

CREATE POLICY "Admins can manage user_menu_access"
ON public.user_menu_access
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.user_id = auth.uid()
    AND r.code IN ('super_admin', 'admin', 'tenant_admin')
  )
);

-- Create audit logs table
CREATE TABLE public.user_menu_access_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  target_user_id uuid NOT NULL,
  actor_id uuid,
  action text NOT NULL CHECK (action IN ('grant', 'revoke', 'reset')),
  menu_item_id uuid,
  menu_item_ids uuid[],
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Index for audit logs
CREATE INDEX idx_user_menu_access_audit_target ON public.user_menu_access_audit_logs(target_user_id);
CREATE INDEX idx_user_menu_access_audit_tenant ON public.user_menu_access_audit_logs(tenant_id);

-- Enable RLS for audit logs
ALTER TABLE public.user_menu_access_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for user_menu_access_audit_logs"
ON public.user_menu_access_audit_logs
FOR SELECT
USING (tenant_id = public.get_auth_tenant_id());

CREATE POLICY "Admins can insert audit logs"
ON public.user_menu_access_audit_logs
FOR INSERT
WITH CHECK (tenant_id = public.get_auth_tenant_id());

-- Update get_accessible_menu_items to include user-specific access
CREATE OR REPLACE FUNCTION public.get_accessible_menu_items(_user_id uuid)
RETURNS TABLE(menu_code text, menu_url text, parent_code text, sort_order integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT m.code, m.url, m.parent_code, m.sort_order
  FROM menu_items m
  WHERE m.id IN (
      -- Role-based access
      SELECT rma.menu_item_id
      FROM role_menu_access rma
      JOIN user_role_assignments ura ON ura.role_id = rma.role_id
      JOIN profiles p ON p.id = ura.user_id
      WHERE ura.user_id = _user_id 
        AND rma.tenant_id = p.tenant_id
      
      UNION
      
      -- User-specific access (override)
      SELECT uma.menu_item_id
      FROM user_menu_access uma
      JOIN profiles p ON p.id = _user_id
      WHERE uma.user_id = _user_id 
        AND uma.tenant_id = p.tenant_id
        AND uma.deleted_at IS NULL
    )
  ORDER BY sort_order;
$$;

-- Function to get user-specific menu access (for admin UI)
CREATE OR REPLACE FUNCTION public.get_user_menu_access(_user_id uuid)
RETURNS TABLE(
  menu_item_id uuid,
  menu_code text,
  menu_name text,
  menu_name_ar text,
  parent_code text,
  sort_order integer,
  access_type text,
  granted_by uuid,
  granted_at timestamptz,
  notes text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Role-based access
  SELECT DISTINCT 
    m.id as menu_item_id,
    m.code as menu_code,
    m.name as menu_name,
    m.name_ar as menu_name_ar,
    m.parent_code,
    m.sort_order,
    'role'::text as access_type,
    NULL::uuid as granted_by,
    NULL::timestamptz as granted_at,
    NULL::text as notes
  FROM menu_items m
  JOIN role_menu_access rma ON rma.menu_item_id = m.id
  JOIN user_role_assignments ura ON ura.role_id = rma.role_id
  JOIN profiles p ON p.id = ura.user_id
  WHERE ura.user_id = _user_id 
    AND rma.tenant_id = p.tenant_id
  
  UNION ALL
  
  -- User-specific access
  SELECT DISTINCT 
    m.id as menu_item_id,
    m.code as menu_code,
    m.name as menu_name,
    m.name_ar as menu_name_ar,
    m.parent_code,
    m.sort_order,
    'user'::text as access_type,
    uma.granted_by,
    uma.granted_at,
    uma.notes
  FROM menu_items m
  JOIN user_menu_access uma ON uma.menu_item_id = m.id
  JOIN profiles p ON p.id = _user_id
  WHERE uma.user_id = _user_id 
    AND uma.deleted_at IS NULL
    AND uma.tenant_id = p.tenant_id
  
  ORDER BY sort_order;
$$;