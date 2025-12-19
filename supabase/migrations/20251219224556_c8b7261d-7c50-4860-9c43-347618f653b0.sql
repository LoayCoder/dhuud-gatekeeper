-- Add missing menu items to menu_items table
INSERT INTO public.menu_items (code, name, name_ar, parent_code, url, icon, sort_order, is_system)
VALUES 
  ('admin_manhours', 'Manhours Management', 'إدارة ساعات العمل', 'administration', '/admin/manhours', 'Clock', 18, true),
  ('admin_kpi_targets', 'KPI Targets', 'أهداف مؤشرات الأداء', 'administration', '/admin/kpi-targets', 'BarChart3', 19, true),
  ('admin_hsse_notifications', 'HSSE Notifications', 'إشعارات الصحة والسلامة', 'administration', '/admin/hsse-notifications', 'ShieldAlert', 20, true),
  ('admin_hsse_notification_analytics', 'Notification Analytics', 'تحليلات الإشعارات', 'administration', '/admin/hsse-notification-analytics', 'BarChart3', 21, true)
ON CONFLICT (code) DO NOTHING;

-- Grant access to these new menu items for admin roles in all tenants
-- This uses the role_menu_access table which links tenants + roles + menu_items
INSERT INTO public.role_menu_access (tenant_id, role_id, menu_item_id, created_by)
SELECT 
  ura.tenant_id,
  ura.role_id,
  mi.id as menu_item_id,
  NULL as created_by
FROM public.user_role_assignments ura
JOIN public.roles r ON r.id = ura.role_id
CROSS JOIN public.menu_items mi
WHERE r.code IN ('admin', 'super_admin', 'hsse_manager')
  AND mi.code IN ('admin_manhours', 'admin_kpi_targets', 'admin_hsse_notifications', 'admin_hsse_notification_analytics')
GROUP BY ura.tenant_id, ura.role_id, mi.id
ON CONFLICT DO NOTHING;