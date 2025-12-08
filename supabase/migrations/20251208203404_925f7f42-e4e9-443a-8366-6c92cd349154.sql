
-- Create menu_items table to define all navigable menu items
CREATE TABLE public.menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  name_ar text,
  parent_code text,
  url text,
  icon text,
  sort_order integer DEFAULT 0,
  is_system boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create role_menu_access table for tenant-specific role-to-menu mappings
CREATE TABLE public.role_menu_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  menu_item_id uuid NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id),
  UNIQUE(tenant_id, role_id, menu_item_id)
);

-- Enable RLS
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_menu_access ENABLE ROW LEVEL SECURITY;

-- RLS for menu_items (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view menu items"
ON public.menu_items FOR SELECT
USING (auth.uid() IS NOT NULL);

-- RLS for role_menu_access
CREATE POLICY "Users can view their tenant menu access"
ON public.role_menu_access FOR SELECT
USING (tenant_id = get_auth_tenant_id());

CREATE POLICY "Admins can manage their tenant menu access"
ON public.role_menu_access FOR ALL
USING (tenant_id = get_auth_tenant_id() AND is_admin(auth.uid()));

-- Seed default menu items
INSERT INTO public.menu_items (code, name, name_ar, parent_code, url, icon, sort_order) VALUES
-- Top-level items
('dashboard', 'Dashboard', 'لوحة التحكم', NULL, '/', 'LayoutDashboard', 0),

-- HSSE Management group
('hsse_management', 'HSSE Management', 'إدارة السلامة', NULL, NULL, 'Shield', 10),

-- HSSE Events subgroup
('hsse_events', 'HSSE Events', 'أحداث السلامة', 'hsse_management', NULL, 'AlertTriangle', 11),
('event_dashboard', 'Event Dashboard', 'لوحة الأحداث', 'hsse_events', '/incidents/dashboard', 'BarChart3', 12),
('event_list', 'Event List', 'قائمة الأحداث', 'hsse_events', '/incidents', 'List', 13),
('report_event', 'Report Event', 'الإبلاغ عن حدث', 'hsse_events', '/incidents/report', 'FileWarning', 14),
('investigation_workspace', 'Investigation Workspace', 'مساحة التحقيق', 'hsse_events', '/incidents/investigate', 'Search', 15),
('my_actions', 'My Actions', 'إجراءاتي', 'hsse_events', '/incidents/my-actions', 'CheckSquare', 16),

-- Audits & Inspections subgroup
('audits_inspections', 'Audits & Inspections', 'التدقيق والتفتيش', 'hsse_management', NULL, 'ClipboardCheck', 20),
('inspection_dashboard', 'Inspection Dashboard', 'لوحة التفتيش', 'audits_inspections', '/inspections/dashboard', 'BarChart3', 21),
('inspection_sessions', 'Sessions', 'الجلسات', 'audits_inspections', '/inspections/sessions', 'Calendar', 22),
('inspection_schedules', 'Schedules', 'الجداول', 'audits_inspections', '/inspections/schedules', 'CalendarClock', 23),
('my_inspection_actions', 'My Inspection Actions', 'إجراءات التفتيش', 'audits_inspections', '/inspections/my-actions', 'CheckSquare', 24),

-- Visitor Gatekeeper
('visitor_gatekeeper', 'Visitor Gatekeeper', 'بوابة الزوار', 'hsse_management', '/visitors', 'Users', 30),

-- Asset Management subgroup
('asset_management', 'Asset Management', 'إدارة الأصول', 'hsse_management', NULL, 'Box', 40),
('asset_dashboard', 'Asset Dashboard', 'لوحة الأصول', 'asset_management', '/assets/dashboard', 'BarChart3', 41),
('asset_list', 'Asset List', 'قائمة الأصول', 'asset_management', '/assets', 'List', 42),
('register_asset', 'Register Asset', 'تسجيل أصل', 'asset_management', '/assets/register', 'Plus', 43),
('scan_asset', 'Scan Asset', 'مسح الأصل', 'asset_management', '/assets/scan', 'QrCode', 44),

-- Administration group
('administration', 'Administration', 'الإدارة', NULL, NULL, 'Settings', 50),
('admin_branding', 'Brand Management', 'إدارة العلامة التجارية', 'administration', '/admin/branding', 'Palette', 51),
('admin_users', 'User Management', 'إدارة المستخدمين', 'administration', '/admin/user-management', 'Users', 52),
('admin_org', 'Org Structure', 'الهيكل التنظيمي', 'administration', '/admin/org-structure', 'Network', 53),
('admin_templates', 'Inspection Templates', 'قوالب التفتيش', 'administration', '/admin/inspection-templates', 'FileText', 54),
('admin_document_settings', 'Document Settings', 'إعدادات المستندات', 'administration', '/admin/document-settings', 'FileText', 55),
('admin_action_sla', 'Action SLA Settings', 'إعدادات SLA', 'administration', '/admin/action-sla', 'Timer', 56),
('admin_sla_dashboard', 'SLA Dashboard', 'لوحة SLA', 'administration', '/admin/sla-dashboard', 'Gauge', 57),
('admin_team_performance', 'Team Performance', 'أداء الفريق', 'administration', '/admin/team-performance', 'TrendingUp', 58),
('admin_executive_report', 'Executive Report', 'التقرير التنفيذي', 'administration', '/admin/executive-report', 'FileBarChart', 59),
('admin_security_audit', 'Security Audit Log', 'سجل التدقيق الأمني', 'administration', '/admin/security-audit', 'Shield', 60),
('admin_menu_access', 'Menu Access', 'صلاحيات القائمة', 'administration', '/admin/menu-access', 'Menu', 61),

-- Settings group
('settings', 'Settings', 'الإعدادات', NULL, NULL, 'Settings', 70),
('settings_subscription', 'Usage & Billing', 'الاستخدام والفوترة', 'settings', '/settings/subscription', 'CreditCard', 71),
('settings_support', 'Support', 'الدعم', 'settings', '/support', 'HelpCircle', 72);

-- Create RPC function to get accessible menu items for a user
CREATE OR REPLACE FUNCTION public.get_accessible_menu_items(_user_id uuid)
RETURNS TABLE(menu_code text, menu_url text, parent_code text, sort_order integer)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT m.code, m.url, m.parent_code, m.sort_order
  FROM menu_items m
  JOIN role_menu_access rma ON rma.menu_item_id = m.id
  JOIN user_role_assignments ura ON ura.role_id = rma.role_id
  JOIN profiles p ON p.id = ura.user_id
  WHERE ura.user_id = _user_id
    AND rma.tenant_id = p.tenant_id
  ORDER BY m.sort_order;
$$;

GRANT EXECUTE ON FUNCTION public.get_accessible_menu_items(uuid) TO authenticated;

-- Create function to auto-populate default menu access for a tenant
CREATE OR REPLACE FUNCTION public.populate_default_menu_access(p_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_role_id uuid;
  v_normal_user_role_id uuid;
  v_hsse_roles uuid[];
  v_security_roles uuid[];
  v_menu_item RECORD;
BEGIN
  -- Get role IDs
  SELECT id INTO v_admin_role_id FROM roles WHERE code = 'admin';
  SELECT id INTO v_normal_user_role_id FROM roles WHERE code = 'normal_user';
  SELECT ARRAY_AGG(id) INTO v_hsse_roles FROM roles WHERE category = 'hsse';
  SELECT ARRAY_AGG(id) INTO v_security_roles FROM roles WHERE category = 'security';

  -- Admin gets all menu items
  INSERT INTO role_menu_access (tenant_id, role_id, menu_item_id)
  SELECT p_tenant_id, v_admin_role_id, id FROM menu_items
  ON CONFLICT DO NOTHING;

  -- Normal user gets limited access (dashboard, report event, my actions, support)
  INSERT INTO role_menu_access (tenant_id, role_id, menu_item_id)
  SELECT p_tenant_id, v_normal_user_role_id, id 
  FROM menu_items 
  WHERE code IN ('dashboard', 'hsse_management', 'hsse_events', 'report_event', 'my_actions', 'settings', 'settings_support')
  ON CONFLICT DO NOTHING;

  -- HSSE roles get HSSE-related menus
  IF v_hsse_roles IS NOT NULL THEN
    FOR i IN 1..array_length(v_hsse_roles, 1) LOOP
      INSERT INTO role_menu_access (tenant_id, role_id, menu_item_id)
      SELECT p_tenant_id, v_hsse_roles[i], id 
      FROM menu_items 
      WHERE code IN (
        'dashboard', 'hsse_management', 'hsse_events', 'event_dashboard', 'event_list', 
        'report_event', 'investigation_workspace', 'my_actions',
        'audits_inspections', 'inspection_dashboard', 'inspection_sessions', 
        'inspection_schedules', 'my_inspection_actions',
        'asset_management', 'asset_dashboard', 'asset_list', 'register_asset', 'scan_asset',
        'settings', 'settings_support'
      )
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  -- Security roles get visitor gatekeeper
  IF v_security_roles IS NOT NULL THEN
    FOR i IN 1..array_length(v_security_roles, 1) LOOP
      INSERT INTO role_menu_access (tenant_id, role_id, menu_item_id)
      SELECT p_tenant_id, v_security_roles[i], id 
      FROM menu_items 
      WHERE code IN ('dashboard', 'hsse_management', 'visitor_gatekeeper', 'settings', 'settings_support')
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;
END;
$$;

-- Trigger to auto-populate menu access for new tenants
CREATE OR REPLACE FUNCTION public.trigger_populate_menu_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM populate_default_menu_access(NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER after_tenant_insert_populate_menu_access
AFTER INSERT ON public.tenants
FOR EACH ROW
EXECUTE FUNCTION trigger_populate_menu_access();

-- Populate existing tenants with default menu access
DO $$
DECLARE
  t_id uuid;
BEGIN
  FOR t_id IN SELECT id FROM tenants LOOP
    PERFORM populate_default_menu_access(t_id);
  END LOOP;
END;
$$;
