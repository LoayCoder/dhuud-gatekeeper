-- Fix contractor access menu items under security section

-- First, insert contractor_access if it doesn't exist (with required name)
INSERT INTO public.menu_items (code, name, name_ar, parent_code, url, icon, sort_order, is_system)
VALUES ('contractor_access', 'Contractor Access', 'وصول المقاولين', 'security', NULL, 'HardHat', 60, false)
ON CONFLICT (code) DO UPDATE SET parent_code = 'security', sort_order = 60;

-- Update contractor_list to be under security instead of contractors
UPDATE public.menu_items 
SET parent_code = 'security', sort_order = 61
WHERE code = 'contractor_list';

-- Update contractor_check to be under security instead of contractors
UPDATE public.menu_items 
SET parent_code = 'security', sort_order = 62
WHERE code = 'contractor_check';

-- Grant access to contractor_access for relevant roles (admin, security_manager, security_supervisor)
INSERT INTO public.role_menu_access (tenant_id, role_id, menu_item_id)
SELECT DISTINCT 
  t.id as tenant_id,
  r.id as role_id,
  mi.id as menu_item_id
FROM public.tenants t
CROSS JOIN public.roles r
CROSS JOIN public.menu_items mi
WHERE mi.code = 'contractor_access'
  AND r.code IN ('admin', 'security_manager', 'security_supervisor')
ON CONFLICT (tenant_id, role_id, menu_item_id) DO NOTHING;

-- Also ensure contractor_list and contractor_check have role access
INSERT INTO public.role_menu_access (tenant_id, role_id, menu_item_id)
SELECT DISTINCT 
  t.id as tenant_id,
  r.id as role_id,
  mi.id as menu_item_id
FROM public.tenants t
CROSS JOIN public.roles r
CROSS JOIN public.menu_items mi
WHERE mi.code IN ('contractor_list', 'contractor_check')
  AND r.code IN ('admin', 'security_manager', 'security_supervisor')
ON CONFLICT (tenant_id, role_id, menu_item_id) DO NOTHING;