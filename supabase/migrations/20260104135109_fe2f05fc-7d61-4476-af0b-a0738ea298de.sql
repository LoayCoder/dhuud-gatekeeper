-- Insert new Access Dashboard menu item
INSERT INTO menu_items (code, name, name_ar, parent_code, url, icon, sort_order, is_system)
VALUES (
  'access_dashboard',
  'Access Dashboard',
  'لوحة التحكم بالوصول',
  'security',
  '/security/access-control',
  'LayoutDashboard',
  21,
  false
)
ON CONFLICT (code) DO NOTHING;

-- Update visitor_blacklist to security_blacklist with new URL
UPDATE menu_items 
SET 
  code = 'security_blacklist',
  name = 'Blacklist Management',
  name_ar = 'إدارة القائمة السوداء',
  parent_code = 'security',
  url = '/security/blacklist',
  sort_order = 26
WHERE code = 'visitor_blacklist';

-- If no update happened (code already changed), insert it
INSERT INTO menu_items (code, name, name_ar, parent_code, url, icon, sort_order, is_system)
VALUES (
  'security_blacklist',
  'Blacklist Management',
  'إدارة القائمة السوداء',
  'security',
  '/security/blacklist',
  'ShieldAlert',
  26,
  false
)
ON CONFLICT (code) DO NOTHING;

-- Update visitor_register and visitor_list to be under security
UPDATE menu_items 
SET parent_code = 'security', sort_order = 23
WHERE code = 'visitor_register';

UPDATE menu_items 
SET parent_code = 'security', sort_order = 24
WHERE code = 'visitor_list';

-- Grant access_dashboard permissions to roles that had visitor_dashboard access
INSERT INTO role_menu_access (tenant_id, role_id, menu_item_id)
SELECT rma.tenant_id, rma.role_id, mi_new.id
FROM role_menu_access rma
JOIN menu_items mi_old ON mi_old.id = rma.menu_item_id AND mi_old.code = 'visitor_dashboard'
CROSS JOIN menu_items mi_new
WHERE mi_new.code = 'access_dashboard'
ON CONFLICT DO NOTHING;

-- Grant security_blacklist permissions to roles that had visitor_dashboard access
INSERT INTO role_menu_access (tenant_id, role_id, menu_item_id)
SELECT rma.tenant_id, rma.role_id, mi_new.id
FROM role_menu_access rma
JOIN menu_items mi_old ON mi_old.id = rma.menu_item_id AND mi_old.code = 'visitor_dashboard'
CROSS JOIN menu_items mi_new
WHERE mi_new.code = 'security_blacklist'
ON CONFLICT DO NOTHING;