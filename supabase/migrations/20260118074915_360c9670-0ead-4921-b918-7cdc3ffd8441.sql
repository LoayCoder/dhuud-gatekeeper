-- Add Visitors Module to menu_items table
-- 1. Insert visitors_module as top-level menu item
INSERT INTO public.menu_items (code, name, name_ar, parent_code, url, icon, sort_order, is_system)
VALUES ('visitors_module', 'Visitors', 'الزوار', NULL, NULL, 'Users', 15, true)
ON CONFLICT (code) DO UPDATE SET 
  parent_code = EXCLUDED.parent_code,
  sort_order = EXCLUDED.sort_order;

-- 2. Update visitor_dashboard to use new parent and correct URL
UPDATE public.menu_items 
SET parent_code = 'visitors_module', url = '/visitors/dashboard', sort_order = 1
WHERE code = 'visitor_dashboard';

-- 3. Update visitor_register to use new parent
UPDATE public.menu_items 
SET parent_code = 'visitors_module', sort_order = 2
WHERE code = 'visitor_register';

-- 4. Insert walk_in_registration menu item
INSERT INTO public.menu_items (code, name, name_ar, parent_code, url, icon, sort_order, is_system)
VALUES ('walk_in_registration', 'Walk-In Registration', 'تسجيل الحضور المباشر', 'visitors_module', '/visitors/walk-in', 'UserCheck', 3, true)
ON CONFLICT (code) DO UPDATE SET 
  parent_code = EXCLUDED.parent_code,
  url = EXCLUDED.url,
  sort_order = EXCLUDED.sort_order;

-- 5. Insert today_visitors menu item
INSERT INTO public.menu_items (code, name, name_ar, parent_code, url, icon, sort_order, is_system)
VALUES ('today_visitors', 'Today''s Visitors', 'زوار اليوم', 'visitors_module', '/visitors/today', 'Clock', 4, true)
ON CONFLICT (code) DO UPDATE SET 
  parent_code = EXCLUDED.parent_code,
  url = EXCLUDED.url,
  sort_order = EXCLUDED.sort_order;

-- 6. Update visitor_list to use new parent
UPDATE public.menu_items
SET parent_code = 'visitors_module', sort_order = 5
WHERE code = 'visitor_list';

-- 7. Update admin_visitor_settings to use new parent
UPDATE public.menu_items 
SET parent_code = 'visitors_module', sort_order = 6
WHERE code = 'admin_visitor_settings';