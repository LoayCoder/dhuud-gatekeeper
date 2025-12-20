-- Insert menu item for Notification Delivery Log
INSERT INTO menu_items (code, name, name_ar, parent_code, url, sort_order)
VALUES (
  'admin_notification_logs',
  'Notification Delivery Log',
  'سجل تسليم الإشعارات',
  'administration',
  '/admin/notification-logs',
  22
);

-- Grant access to admin roles using menu_item_id
INSERT INTO role_menu_access (role_id, menu_item_id, tenant_id)
SELECT r.id, m.id, p.tenant_id
FROM roles r
CROSS JOIN menu_items m
CROSS JOIN profiles p
WHERE r.code IN ('admin', 'super_admin', 'hsse_manager')
  AND m.code = 'admin_notification_logs'
  AND p.id = auth.uid()
LIMIT 3;