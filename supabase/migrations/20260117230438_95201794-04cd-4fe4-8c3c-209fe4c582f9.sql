-- =============================================
-- Phase 2: Add Receptionist Role & Reception Menu Items
-- =============================================

-- 1. Add 'receptionist' to app_role enum if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'receptionist' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')) THEN
    ALTER TYPE public.app_role ADD VALUE 'receptionist';
  END IF;
END $$;

-- 2. Insert receptionist role into roles table
INSERT INTO public.roles (code, name, description, category, is_system, module_access, sort_order, is_active)
VALUES (
  'receptionist',
  'Receptionist',
  'Handles visitor registration and check-in at reception desk',
  'security',
  false,
  ARRAY['visitors', 'security'],
  25,
  true
)
ON CONFLICT (code) DO NOTHING;

-- 3. Add Reception parent menu group
INSERT INTO public.menu_items (code, name, name_ar, parent_code, url, icon, sort_order, is_system)
VALUES (
  'reception',
  'Reception',
  'الاستقبال',
  NULL,
  NULL,
  'ConciergeBell',
  50,
  false
)
ON CONFLICT (code) DO NOTHING;

-- 4. Add Reception Dashboard menu item
INSERT INTO public.menu_items (code, name, name_ar, parent_code, url, icon, sort_order, is_system)
VALUES (
  'reception_dashboard',
  'Reception Dashboard',
  'لوحة الاستقبال',
  'reception',
  '/reception',
  'LayoutDashboard',
  1,
  false
)
ON CONFLICT (code) DO NOTHING;

-- 5. Add Walk-In Registration menu item
INSERT INTO public.menu_items (code, name, name_ar, parent_code, url, icon, sort_order, is_system)
VALUES (
  'reception_walkin',
  'Walk-In Registration',
  'تسجيل زائر مباشر',
  'reception',
  '/reception/walk-in',
  'UserPlus',
  2,
  false
)
ON CONFLICT (code) DO NOTHING;

-- 6. Add Today's Visitors menu item
INSERT INTO public.menu_items (code, name, name_ar, parent_code, url, icon, sort_order, is_system)
VALUES (
  'reception_today',
  'Today''s Visitors',
  'زوار اليوم',
  'reception',
  '/reception/today',
  'CalendarClock',
  3,
  false
)
ON CONFLICT (code) DO NOTHING;

-- 7. Grant menu access to receptionist role (using role_id and menu_item_id)
INSERT INTO public.role_menu_access (tenant_id, role_id, menu_item_id)
SELECT 
  t.id,
  r.id,
  m.id
FROM public.tenants t
CROSS JOIN public.roles r
CROSS JOIN public.menu_items m
WHERE r.code = 'receptionist'
  AND m.code IN ('reception', 'reception_dashboard', 'reception_walkin', 'reception_today', 'visitor_gatekeeper', 'visitor_register', 'visitor_list')
ON CONFLICT DO NOTHING;

-- 8. Also grant security_officer access to reception menus
INSERT INTO public.role_menu_access (tenant_id, role_id, menu_item_id)
SELECT 
  t.id,
  r.id,
  m.id
FROM public.tenants t
CROSS JOIN public.roles r
CROSS JOIN public.menu_items m
WHERE r.code = 'security_officer'
  AND m.code IN ('reception', 'reception_dashboard', 'reception_walkin', 'reception_today')
ON CONFLICT DO NOTHING;

-- 9. Grant security_manager full access to reception menus
INSERT INTO public.role_menu_access (tenant_id, role_id, menu_item_id)
SELECT 
  t.id,
  r.id,
  m.id
FROM public.tenants t
CROSS JOIN public.roles r
CROSS JOIN public.menu_items m
WHERE r.code = 'security_manager'
  AND m.code IN ('reception', 'reception_dashboard', 'reception_walkin', 'reception_today')
ON CONFLICT DO NOTHING;