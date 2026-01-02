-- Insert missing menu items that are referenced in AppSidebar.tsx
INSERT INTO menu_items (code, name, name_ar, icon, url, parent_code, sort_order, is_system) VALUES
-- SLA Management Group
('admin_sla_management', 'SLA Management', 'إدارة اتفاقيات الخدمة', 'Clock', NULL, 'administration', 101, true),
('admin_finding_sla', 'Finding SLA Settings', 'إعدادات اتفاقية الملاحظات', 'ClipboardCheck', '/admin/finding-sla', 'admin_sla_management', 103, true),
('admin_investigation_sla', 'Investigation SLA', 'اتفاقية التحقيق', 'FileWarning', '/admin/investigation-sla', 'admin_sla_management', 104, true),
('admin_violation_sla', 'Violation Settings', 'إعدادات المخالفات', 'AlertTriangle', '/admin/violation-sla', 'admin_sla_management', 105, true),
('admin_sla_analytics', 'SLA Analytics', 'تحليلات الاتفاقيات', 'BarChart3', '/admin/sla-analytics', 'admin_sla_management', 106, true),

-- User & Access Group
('admin_user_access', 'User & Access', 'المستخدمون والصلاحيات', 'Users', NULL, 'administration', 110, true),

-- Notifications Group
('admin_notifications_group', 'Notifications', 'الإشعارات', 'Bell', NULL, 'administration', 120, true),

-- Reporting & KPIs Group
('admin_reporting_kpis', 'Reporting & KPIs', 'التقارير ومؤشرات الأداء', 'BarChart3', NULL, 'administration', 130, true),
('admin_analytics', 'Usage Analytics', 'تحليلات الاستخدام', 'BarChart3', '/admin/analytics', 'admin_reporting_kpis', 134, true),

-- System Config Group
('admin_system_config', 'System Configuration', 'إعدادات النظام', 'Settings2', NULL, 'administration', 140, true),

-- Platform Management Group
('admin_platform_management', 'Platform Management', 'إدارة المنصة', 'Layers', NULL, 'administration', 150, true),
('admin_billing', 'Billing Overview', 'نظرة عامة على الفوترة', 'Receipt', '/admin/billing', 'admin_platform_management', 155, true),

-- Asset Management
('purchase_requests', 'Purchase Requests', 'طلبات الشراء', 'CreditCard', '/assets/purchase-requests', 'asset_management', 45, true),
('approval_workflows', 'Approval Workflows', 'سير عمل الموافقات', 'Workflow', '/assets/approval-workflows', 'asset_management', 46, true),

-- Contractors Module
('contractor_analytics', 'Analytics', 'التحليلات', 'BarChart3', '/contractors/analytics', 'contractors_module', 57, true)
ON CONFLICT (code) DO NOTHING;

-- Update existing menu items to ensure correct parent_code references
UPDATE menu_items SET parent_code = 'admin_sla_management' 
WHERE code IN ('admin_action_sla', 'admin_sla_dashboard') AND parent_code != 'admin_sla_management';

UPDATE menu_items SET parent_code = 'admin_user_access' 
WHERE code IN ('admin_users', 'admin_roles', 'admin_menu_permissions') AND parent_code = 'administration';

UPDATE menu_items SET parent_code = 'admin_notifications_group' 
WHERE code IN ('admin_notifications', 'admin_notification_templates') AND parent_code = 'administration';

UPDATE menu_items SET parent_code = 'admin_reporting_kpis' 
WHERE code IN ('admin_kpis', 'admin_reports') AND parent_code = 'administration';

UPDATE menu_items SET parent_code = 'admin_system_config' 
WHERE code IN ('admin_workflow', 'admin_custom_fields', 'admin_import_export', 'admin_settings') AND parent_code = 'administration';

UPDATE menu_items SET parent_code = 'admin_platform_management' 
WHERE code IN ('admin_tenants', 'admin_modules', 'admin_subscription') AND parent_code = 'administration';

-- Assign all new menu items to Admin role for all tenants
INSERT INTO role_menu_access (role_id, menu_item_id, tenant_id)
SELECT 
  r.id,
  mi.id,
  t.id
FROM roles r
CROSS JOIN menu_items mi
CROSS JOIN tenants t
WHERE r.code = 'admin'
AND mi.code IN (
  'admin_sla_management', 'admin_finding_sla', 'admin_investigation_sla',
  'admin_violation_sla', 'admin_sla_analytics', 'admin_user_access',
  'admin_notifications_group', 'admin_reporting_kpis', 'admin_analytics',
  'admin_system_config', 'admin_platform_management', 'admin_billing',
  'purchase_requests', 'approval_workflows', 'contractor_analytics'
)
AND NOT EXISTS (
  SELECT 1 FROM role_menu_access rma 
  WHERE rma.role_id = r.id AND rma.menu_item_id = mi.id AND rma.tenant_id = t.id
);