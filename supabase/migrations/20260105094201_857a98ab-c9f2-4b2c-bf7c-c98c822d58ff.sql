-- Add Training parent menu
INSERT INTO menu_items (code, name, name_ar, icon, parent_code, url, sort_order, is_system)
VALUES ('training', 'Training', 'التدريب', 'GraduationCap', NULL, NULL, 85, true)
ON CONFLICT (code) DO NOTHING;

-- Add Training Center sub-menu
INSERT INTO menu_items (code, name, name_ar, icon, parent_code, url, sort_order, is_system)
VALUES ('training_center', 'Training Center', 'مركز التدريب', 'BookOpen', 'training', '/admin/training-center', 86, true)
ON CONFLICT (code) DO NOTHING;

-- Grant training menu access to ALL roles for ALL tenants
INSERT INTO role_menu_access (tenant_id, role_id, menu_item_id)
SELECT t.id, r.id, m.id
FROM tenants t
CROSS JOIN roles r
CROSS JOIN menu_items m
WHERE m.code IN ('training', 'training_center')
  AND r.is_active = true
ON CONFLICT DO NOTHING;