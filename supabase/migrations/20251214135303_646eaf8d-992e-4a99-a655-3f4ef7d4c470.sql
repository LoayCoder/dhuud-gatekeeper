-- Insert missing Workforce Command menu items
INSERT INTO menu_items (code, name, name_ar, parent_code, url, sort_order, icon)
VALUES 
  ('workforce_command', 'Workforce Command', 'مركز القيادة', 'security', NULL, 40, 'Radio'),
  ('command_center', 'Command Center', 'مركز القيادة', 'workforce_command', '/security/command-center', 41, 'MapPin'),
  ('security_zones', 'Security Zones', 'المناطق الأمنية', 'workforce_command', '/security/zones', 42, 'Map'),
  ('security_shifts', 'Shifts', 'الورديات', 'workforce_command', '/security/shifts', 43, 'Clock'),
  ('shift_roster', 'Shift Roster', 'جدول الورديات', 'workforce_command', '/security/roster', 44, 'CalendarDays'),
  ('my_location', 'My Location', 'موقعي', 'workforce_command', '/security/my-location', 45, 'Navigation'),
  ('contractors', 'Contractors', 'المقاولون', 'security', NULL, 50, 'HardHat'),
  ('contractor_list', 'Contractor List', 'قائمة المقاولين', 'contractors', '/security/contractors', 51, 'Users'),
  ('contractor_check', 'Contractor Check', 'فحص المقاول', 'contractors', '/security/contractor-check', 52, 'ScanLine')
ON CONFLICT (code) DO NOTHING;

-- Add role_menu_access for security roles
DO $$
DECLARE
  v_admin_role_id UUID;
  v_security_guard_role_id UUID;
  v_security_supervisor_role_id UUID;
  v_security_manager_role_id UUID;
  v_menu_workforce_command UUID;
  v_menu_command_center UUID;
  v_menu_security_zones UUID;
  v_menu_security_shifts UUID;
  v_menu_shift_roster UUID;
  v_menu_my_location UUID;
  v_menu_contractors UUID;
  v_menu_contractor_list UUID;
  v_menu_contractor_check UUID;
  v_tenant RECORD;
BEGIN
  -- Get role IDs
  SELECT id INTO v_admin_role_id FROM roles WHERE code = 'admin';
  SELECT id INTO v_security_guard_role_id FROM roles WHERE code = 'security_guard';
  SELECT id INTO v_security_supervisor_role_id FROM roles WHERE code = 'security_supervisor';
  SELECT id INTO v_security_manager_role_id FROM roles WHERE code = 'security_manager';
  
  -- Get menu item IDs
  SELECT id INTO v_menu_workforce_command FROM menu_items WHERE code = 'workforce_command';
  SELECT id INTO v_menu_command_center FROM menu_items WHERE code = 'command_center';
  SELECT id INTO v_menu_security_zones FROM menu_items WHERE code = 'security_zones';
  SELECT id INTO v_menu_security_shifts FROM menu_items WHERE code = 'security_shifts';
  SELECT id INTO v_menu_shift_roster FROM menu_items WHERE code = 'shift_roster';
  SELECT id INTO v_menu_my_location FROM menu_items WHERE code = 'my_location';
  SELECT id INTO v_menu_contractors FROM menu_items WHERE code = 'contractors';
  SELECT id INTO v_menu_contractor_list FROM menu_items WHERE code = 'contractor_list';
  SELECT id INTO v_menu_contractor_check FROM menu_items WHERE code = 'contractor_check';
  
  -- For each tenant, add role_menu_access entries
  FOR v_tenant IN SELECT id FROM tenants LOOP
    -- Admin access to all new menus
    IF v_admin_role_id IS NOT NULL THEN
      INSERT INTO role_menu_access (tenant_id, role_id, menu_item_id)
      SELECT v_tenant.id, v_admin_role_id, menu_id
      FROM unnest(ARRAY[v_menu_workforce_command, v_menu_command_center, v_menu_security_zones, v_menu_security_shifts, v_menu_shift_roster, v_menu_my_location, v_menu_contractors, v_menu_contractor_list, v_menu_contractor_check]) AS menu_id
      WHERE menu_id IS NOT NULL
      ON CONFLICT (tenant_id, role_id, menu_item_id) DO NOTHING;
    END IF;
    
    -- Security Guard access
    IF v_security_guard_role_id IS NOT NULL THEN
      INSERT INTO role_menu_access (tenant_id, role_id, menu_item_id)
      SELECT v_tenant.id, v_security_guard_role_id, menu_id
      FROM unnest(ARRAY[v_menu_workforce_command, v_menu_command_center, v_menu_security_zones, v_menu_security_shifts, v_menu_shift_roster, v_menu_my_location, v_menu_contractors, v_menu_contractor_list, v_menu_contractor_check]) AS menu_id
      WHERE menu_id IS NOT NULL
      ON CONFLICT (tenant_id, role_id, menu_item_id) DO NOTHING;
    END IF;
    
    -- Security Supervisor access
    IF v_security_supervisor_role_id IS NOT NULL THEN
      INSERT INTO role_menu_access (tenant_id, role_id, menu_item_id)
      SELECT v_tenant.id, v_security_supervisor_role_id, menu_id
      FROM unnest(ARRAY[v_menu_workforce_command, v_menu_command_center, v_menu_security_zones, v_menu_security_shifts, v_menu_shift_roster, v_menu_my_location, v_menu_contractors, v_menu_contractor_list, v_menu_contractor_check]) AS menu_id
      WHERE menu_id IS NOT NULL
      ON CONFLICT (tenant_id, role_id, menu_item_id) DO NOTHING;
    END IF;
    
    -- Security Manager access
    IF v_security_manager_role_id IS NOT NULL THEN
      INSERT INTO role_menu_access (tenant_id, role_id, menu_item_id)
      SELECT v_tenant.id, v_security_manager_role_id, menu_id
      FROM unnest(ARRAY[v_menu_workforce_command, v_menu_command_center, v_menu_security_zones, v_menu_security_shifts, v_menu_shift_roster, v_menu_my_location, v_menu_contractors, v_menu_contractor_list, v_menu_contractor_check]) AS menu_id
      WHERE menu_id IS NOT NULL
      ON CONFLICT (tenant_id, role_id, menu_item_id) DO NOTHING;
    END IF;
  END LOOP;
END $$;