-- Create the Contractor Admin role
INSERT INTO roles (id, code, name, category, description, is_system, module_access, sort_order, is_active)
VALUES (
  gen_random_uuid(),
  'contractor_admin',
  'Contractor Admin',
  'contractor',
  'Full administrative access to contractor management including companies, projects, workers, gate passes, and settings',
  false,
  ARRAY['contractors', 'contractor_workers', 'contractor_companies', 'contractor_projects', 'contractor_gate_passes'],
  1,
  true
);

-- Grant menu access to all contractor management pages for all tenants
INSERT INTO role_menu_access (id, tenant_id, role_id, menu_item_id, created_at)
SELECT 
  gen_random_uuid(),
  t.id,
  r.id,
  mi.id,
  now()
FROM roles r
CROSS JOIN tenants t
CROSS JOIN menu_items mi
WHERE r.code = 'contractor_admin'
AND mi.code IN (
  'contractors_module',
  'contractor_dashboard',
  'contractor_companies',
  'contractor_projects',
  'contractor_workers',
  'contractor_gate_passes',
  'contractor_induction_videos',
  'contractor_analytics',
  'contractor_settings'
);