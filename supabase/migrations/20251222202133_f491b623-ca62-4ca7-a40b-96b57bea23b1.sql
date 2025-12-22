-- Insert new menu item for Event Categories under Settings
INSERT INTO menu_items (code, name, name_ar, parent_code, url, icon, sort_order, is_system)
VALUES (
  'settings_event_categories',
  'Event Categories',
  'فئات الأحداث',
  'settings',
  '/settings/event-categories',
  'Tags',
  74,
  false
) ON CONFLICT (code) DO NOTHING;

-- Grant access to admin roles for the new menu item
INSERT INTO role_menu_access (role_id, menu_item_id, tenant_id)
SELECT 
  r.id,
  m.id,
  ura.tenant_id
FROM roles r
CROSS JOIN menu_items m
JOIN user_role_assignments ura ON ura.role_id = r.id
WHERE r.code IN ('super_admin', 'admin', 'tenant_admin')
  AND m.code = 'settings_event_categories'
ON CONFLICT DO NOTHING;