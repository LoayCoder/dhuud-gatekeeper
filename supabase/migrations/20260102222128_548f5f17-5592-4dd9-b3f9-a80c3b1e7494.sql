-- Insert Emergency Instructions menu item
INSERT INTO menu_items (code, name, name_ar, icon, url, parent_code, sort_order, is_system) VALUES
('admin_emergency_instructions', 'Emergency Instructions', 'تعليمات الطوارئ', 'AlertTriangle', '/admin/emergency-instructions', 'admin_system_config', 145, true)
ON CONFLICT (code) DO NOTHING;

-- Assign to Admin role for all tenants
INSERT INTO role_menu_access (role_id, menu_item_id, tenant_id)
SELECT r.id, mi.id, t.id
FROM roles r
CROSS JOIN menu_items mi
CROSS JOIN tenants t
WHERE r.code = 'admin'
AND mi.code = 'admin_emergency_instructions'
AND NOT EXISTS (
  SELECT 1 FROM role_menu_access rma 
  WHERE rma.role_id = r.id AND rma.menu_item_id = mi.id AND rma.tenant_id = t.id
);