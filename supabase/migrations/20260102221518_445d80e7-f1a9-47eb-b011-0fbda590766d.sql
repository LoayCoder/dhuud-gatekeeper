-- Insert missing settings menu items
INSERT INTO menu_items (code, name, name_ar, icon, url, parent_code, sort_order, is_system) VALUES
-- Webpage Notification Settings under Notifications Group
('admin_webpage_notifications', 'Webpage Notifications', 'إشعارات الصفحات', 'Globe', '/admin/webpage-notifications', 'admin_notifications_group', 125, true),

-- Contractor Settings under Contractors Module
('contractor_settings', 'Settings', 'الإعدادات', 'Settings2', '/contractors/settings', 'contractors_module', 60, true)
ON CONFLICT (code) DO NOTHING;

-- Assign new menu items to Admin role for all tenants
INSERT INTO role_menu_access (role_id, menu_item_id, tenant_id)
SELECT r.id, mi.id, t.id
FROM roles r
CROSS JOIN menu_items mi
CROSS JOIN tenants t
WHERE r.code = 'admin'
AND mi.code IN ('admin_webpage_notifications', 'contractor_settings')
AND NOT EXISTS (
  SELECT 1 FROM role_menu_access rma 
  WHERE rma.role_id = r.id AND rma.menu_item_id = mi.id AND rma.tenant_id = t.id
);