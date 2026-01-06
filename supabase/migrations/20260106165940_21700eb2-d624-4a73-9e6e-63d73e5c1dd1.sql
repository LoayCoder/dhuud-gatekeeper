-- Insert security_team menu item under workforce_command
INSERT INTO menu_items (code, name, name_ar, parent_code, url, icon, sort_order, is_system)
VALUES (
  'security_team',
  'Security Team',
  'فريق الأمن',
  'workforce_command',
  '/security/team',
  'Users',
  1,
  true
)
ON CONFLICT (code) DO NOTHING;

-- Update sort order of other items under workforce_command to make room
UPDATE menu_items 
SET sort_order = sort_order + 1 
WHERE parent_code = 'workforce_command' 
  AND code != 'security_team';

-- Grant access to admin, security_manager, and security_supervisor roles
INSERT INTO role_menu_access (role_id, menu_item_id, tenant_id)
SELECT r.id, m.id, t.id
FROM roles r
CROSS JOIN menu_items m
CROSS JOIN tenants t
WHERE r.code IN ('admin', 'security_manager', 'security_supervisor')
  AND m.code = 'security_team'
  AND NOT EXISTS (
    SELECT 1 FROM role_menu_access rma
    WHERE rma.role_id = r.id
      AND rma.menu_item_id = m.id
      AND rma.tenant_id = t.id
  );