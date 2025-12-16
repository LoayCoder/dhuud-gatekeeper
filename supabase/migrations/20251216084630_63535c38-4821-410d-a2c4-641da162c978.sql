-- Insert PTW menu items into menu_items table
INSERT INTO public.menu_items (code, parent_code, name, name_ar, url, icon, sort_order, is_system)
VALUES
  ('ptw_module', NULL, 'Permit to Work', 'تصريح العمل', NULL, 'FileKey', 35, true),
  ('ptw_dashboard', 'ptw_module', 'PTW Dashboard', 'لوحة تصاريح العمل', '/ptw', 'LayoutDashboard', 1, true),
  ('ptw_projects', 'ptw_module', 'Project Mobilization', 'تعبئة المشاريع', '/ptw/projects', 'HardHat', 2, true),
  ('ptw_console', 'ptw_module', 'Permit Console', 'وحدة التحكم في التصاريح', '/ptw/console', 'Map', 3, true),
  ('ptw_create', 'ptw_module', 'Create Permit', 'إنشاء تصريح', '/ptw/create', 'Plus', 4, true)
ON CONFLICT (code) DO NOTHING;

-- Grant PTW menu access to admin, ptw_coordinator, hsse_officer, hsse_manager roles
INSERT INTO public.role_menu_access (tenant_id, role_id, menu_item_id)
SELECT t.id, r.id, mi.id
FROM public.tenants t
CROSS JOIN public.roles r
CROSS JOIN public.menu_items mi
WHERE r.code IN ('admin', 'ptw_coordinator', 'ptw_permit_authority', 'hsse_officer', 'hsse_manager', 'hsse_expert')
  AND mi.code IN ('ptw_module', 'ptw_dashboard', 'ptw_projects', 'ptw_console', 'ptw_create')
ON CONFLICT DO NOTHING;