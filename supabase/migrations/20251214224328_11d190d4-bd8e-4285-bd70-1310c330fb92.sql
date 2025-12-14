-- Step 1: Insert new Contractor Module menu items
INSERT INTO menu_items (id, code, name, name_ar, parent_code, url, icon, sort_order, is_system)
VALUES
  (gen_random_uuid(), 'contractors_module', 'Contractors', 'المقاولون', NULL, NULL, 'Briefcase', 45, true),
  (gen_random_uuid(), 'contractor_dashboard', 'Dashboard', 'لوحة التحكم', 'contractors_module', '/contractors', 'LayoutDashboard', 46, true),
  (gen_random_uuid(), 'contractor_companies', 'Companies', 'الشركات', 'contractors_module', '/contractors/companies', 'Building2', 47, true),
  (gen_random_uuid(), 'contractor_projects', 'Projects', 'المشاريع', 'contractors_module', '/contractors/projects', 'Briefcase', 48, true),
  (gen_random_uuid(), 'contractor_workers', 'Workers', 'العمال', 'contractors_module', '/contractors/workers', 'Users', 49, true),
  (gen_random_uuid(), 'contractor_gate_passes', 'Gate Passes', 'تصاريح الدخول', 'contractors_module', '/contractors/gate-passes', 'FileWarning', 50, true),
  (gen_random_uuid(), 'contractor_induction_videos', 'Induction Videos', 'فيديوهات التعريف', 'contractors_module', '/contractors/induction-videos', 'Video', 51, true)
ON CONFLICT (code) DO NOTHING;

-- Step 2: Update legacy contractors menu code under security
UPDATE menu_items 
SET code = 'legacy_contractors', name = 'Legacy Contractors', name_ar = 'المقاولون (قديم)'
WHERE code = 'contractors' AND parent_code = 'security';

-- Step 3: Grant role access to new menu items for admin role (for all tenants)
INSERT INTO role_menu_access (tenant_id, role_id, menu_item_id)
SELECT 
  t.id as tenant_id,
  r.id as role_id,
  m.id as menu_item_id
FROM tenants t
CROSS JOIN roles r
CROSS JOIN menu_items m
WHERE r.code = 'admin'
AND m.code IN ('contractors_module', 'contractor_dashboard', 'contractor_companies', 
               'contractor_projects', 'contractor_workers', 'contractor_gate_passes', 
               'contractor_induction_videos')
ON CONFLICT DO NOTHING;

-- Step 4: Also grant access to security_manager and security_supervisor roles
INSERT INTO role_menu_access (tenant_id, role_id, menu_item_id)
SELECT 
  t.id as tenant_id,
  r.id as role_id,
  m.id as menu_item_id
FROM tenants t
CROSS JOIN roles r
CROSS JOIN menu_items m
WHERE r.code IN ('security_manager', 'security_supervisor')
AND m.code IN ('contractors_module', 'contractor_dashboard', 'contractor_companies', 
               'contractor_projects', 'contractor_workers', 'contractor_gate_passes', 
               'contractor_induction_videos')
ON CONFLICT DO NOTHING;