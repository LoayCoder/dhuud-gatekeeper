-- Insert missing security_dashboard menu item
INSERT INTO menu_items (code, name, name_ar, parent_code, url, sort_order, icon)
VALUES ('security_dashboard', 'Security Dashboard', 'لوحة الأمن', 'security', '/security', 28, 'Shield')
ON CONFLICT (code) DO NOTHING;

-- Get role IDs for security-related roles and add role_menu_access
DO $$
DECLARE
  v_admin_role_id UUID;
  v_security_guard_role_id UUID;
  v_security_supervisor_role_id UUID;
  v_security_manager_role_id UUID;
  v_menu_security_dashboard UUID;
  v_menu_patrol_dashboard UUID;
  v_menu_patrol_routes UUID;
  v_menu_patrol_history UUID;
  v_menu_security UUID;
  v_menu_visitor_gatekeeper UUID;
  v_menu_security_patrols UUID;
  v_tenant RECORD;
BEGIN
  -- Get role IDs
  SELECT id INTO v_admin_role_id FROM roles WHERE code = 'admin';
  SELECT id INTO v_security_guard_role_id FROM roles WHERE code = 'security_guard';
  SELECT id INTO v_security_supervisor_role_id FROM roles WHERE code = 'security_supervisor';
  SELECT id INTO v_security_manager_role_id FROM roles WHERE code = 'security_manager';
  
  -- Get menu item IDs
  SELECT id INTO v_menu_security FROM menu_items WHERE code = 'security';
  SELECT id INTO v_menu_security_dashboard FROM menu_items WHERE code = 'security_dashboard';
  SELECT id INTO v_menu_visitor_gatekeeper FROM menu_items WHERE code = 'visitor_gatekeeper';
  SELECT id INTO v_menu_security_patrols FROM menu_items WHERE code = 'security_patrols';
  SELECT id INTO v_menu_patrol_dashboard FROM menu_items WHERE code = 'patrol_dashboard';
  SELECT id INTO v_menu_patrol_routes FROM menu_items WHERE code = 'patrol_routes';
  SELECT id INTO v_menu_patrol_history FROM menu_items WHERE code = 'patrol_history';
  
  -- For each tenant, add role_menu_access entries
  FOR v_tenant IN SELECT id FROM tenants LOOP
    -- Admin access to all security menus
    IF v_admin_role_id IS NOT NULL THEN
      INSERT INTO role_menu_access (tenant_id, role_id, menu_item_id)
      SELECT v_tenant.id, v_admin_role_id, menu_id
      FROM unnest(ARRAY[v_menu_security, v_menu_security_dashboard, v_menu_visitor_gatekeeper, v_menu_security_patrols, v_menu_patrol_dashboard, v_menu_patrol_routes, v_menu_patrol_history]) AS menu_id
      WHERE menu_id IS NOT NULL
      ON CONFLICT (tenant_id, role_id, menu_item_id) DO NOTHING;
    END IF;
    
    -- Security Guard access
    IF v_security_guard_role_id IS NOT NULL THEN
      INSERT INTO role_menu_access (tenant_id, role_id, menu_item_id)
      SELECT v_tenant.id, v_security_guard_role_id, menu_id
      FROM unnest(ARRAY[v_menu_security, v_menu_security_dashboard, v_menu_visitor_gatekeeper, v_menu_security_patrols, v_menu_patrol_dashboard, v_menu_patrol_routes, v_menu_patrol_history]) AS menu_id
      WHERE menu_id IS NOT NULL
      ON CONFLICT (tenant_id, role_id, menu_item_id) DO NOTHING;
    END IF;
    
    -- Security Supervisor access
    IF v_security_supervisor_role_id IS NOT NULL THEN
      INSERT INTO role_menu_access (tenant_id, role_id, menu_item_id)
      SELECT v_tenant.id, v_security_supervisor_role_id, menu_id
      FROM unnest(ARRAY[v_menu_security, v_menu_security_dashboard, v_menu_visitor_gatekeeper, v_menu_security_patrols, v_menu_patrol_dashboard, v_menu_patrol_routes, v_menu_patrol_history]) AS menu_id
      WHERE menu_id IS NOT NULL
      ON CONFLICT (tenant_id, role_id, menu_item_id) DO NOTHING;
    END IF;
    
    -- Security Manager access
    IF v_security_manager_role_id IS NOT NULL THEN
      INSERT INTO role_menu_access (tenant_id, role_id, menu_item_id)
      SELECT v_tenant.id, v_security_manager_role_id, menu_id
      FROM unnest(ARRAY[v_menu_security, v_menu_security_dashboard, v_menu_visitor_gatekeeper, v_menu_security_patrols, v_menu_patrol_dashboard, v_menu_patrol_routes, v_menu_patrol_history]) AS menu_id
      WHERE menu_id IS NOT NULL
      ON CONFLICT (tenant_id, role_id, menu_item_id) DO NOTHING;
    END IF;
  END LOOP;
END $$;