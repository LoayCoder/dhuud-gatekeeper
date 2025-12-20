-- Insert role_menu_access records for admin_notification_logs menu item
-- This links the menu to Admin and HSSE Manager roles for all tenants
INSERT INTO role_menu_access (role_id, menu_item_id, tenant_id)
SELECT 
  r.id as role_id,
  mi.id as menu_item_id,
  t.id as tenant_id
FROM roles r
CROSS JOIN menu_items mi
CROSS JOIN (SELECT DISTINCT tenant_id as id FROM role_menu_access WHERE tenant_id IS NOT NULL) t
WHERE r.name IN ('Admin', 'HSSE Manager')
  AND mi.code = 'admin_notification_logs'
ON CONFLICT DO NOTHING;