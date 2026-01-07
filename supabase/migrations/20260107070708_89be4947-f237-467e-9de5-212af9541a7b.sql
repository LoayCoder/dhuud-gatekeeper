-- Insert the Test Push Notifications menu item under Notifications group
INSERT INTO menu_items (code, name, name_ar, icon, url, parent_code, sort_order, is_system)
VALUES (
  'admin_test_push',
  'Test Push Notifications',
  'اختبار الإشعارات الفورية',
  'BellRing',
  '/admin/test-push',
  'admin_notifications_group',
  126,
  false
);

-- Grant access to admin role
INSERT INTO role_menu_access (role_id, menu_item_id)
SELECT 
  r.id,
  m.id
FROM roles r, menu_items m
WHERE r.name = 'admin' 
  AND m.code = 'admin_test_push';