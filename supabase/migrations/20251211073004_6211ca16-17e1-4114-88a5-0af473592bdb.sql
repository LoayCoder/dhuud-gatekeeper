-- Insert the Workflow Diagrams menu item
INSERT INTO public.menu_items (code, name, name_ar, parent_code, url, icon, sort_order, is_system)
VALUES (
  'admin_workflow_diagrams',
  'Workflow Diagrams',
  'مخططات سير العمل',
  'administration',
  '/admin/workflow-diagrams',
  'Workflow',
  110,
  true
)
ON CONFLICT (code) DO NOTHING;

-- Grant access to Admin role for all tenants
INSERT INTO public.role_menu_access (role_id, menu_item_id, tenant_id)
SELECT 
  r.id as role_id,
  mi.id as menu_item_id,
  t.id as tenant_id
FROM public.roles r
CROSS JOIN public.menu_items mi
CROSS JOIN public.tenants t
WHERE r.code = 'admin'
  AND mi.code = 'admin_workflow_diagrams'
ON CONFLICT DO NOTHING;