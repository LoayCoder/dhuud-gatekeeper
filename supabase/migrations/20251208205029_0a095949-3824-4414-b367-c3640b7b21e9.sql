-- Add missing menu items that exist in sidebar but not in database
INSERT INTO menu_items (code, name, name_ar, parent_code, url, sort_order, is_system) VALUES
('admin_tenants', 'Tenant Management', 'إدارة المستأجرين', 'administration', '/admin/tenants', 62, true),
('admin_support', 'Support Dashboard', 'لوحة الدعم', 'administration', '/admin/support', 63, true),
('admin_subscriptions', 'Subscription Overview', 'نظرة عامة على الاشتراكات', 'administration', '/admin/subscriptions', 64, true),
('admin_modules', 'Module Management', 'إدارة الوحدات', 'administration', '/admin/modules', 65, true),
('admin_plans', 'Plan Management', 'إدارة الخطط', 'administration', '/admin/plans', 66, true),
('settings_billing', 'Usage & Billing', 'الاستخدام والفواتير', 'settings', '/settings/usage-billing', 73, true),
('support', 'Support', 'الدعم', NULL, '/support', 75, true)
ON CONFLICT (code) DO NOTHING;

-- Add access for Admin role for new menu items across all tenants
INSERT INTO role_menu_access (tenant_id, role_id, menu_item_id)
SELECT t.id, r.id, mi.id
FROM tenants t
CROSS JOIN roles r
CROSS JOIN menu_items mi
WHERE r.code = 'admin'
AND mi.code IN ('admin_tenants', 'admin_support', 'admin_subscriptions', 'admin_modules', 'admin_plans', 'settings_billing', 'support')
ON CONFLICT (tenant_id, role_id, menu_item_id) DO NOTHING;