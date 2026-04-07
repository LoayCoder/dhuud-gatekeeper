-- Grant dept_gate_passes menu access to manager, department_representative, admin, hsse_manager, hsse_officer roles for ALL tenants
-- This ensures any approver with these roles can access the gate pass approval pages

INSERT INTO role_menu_access (tenant_id, role_id, menu_item_id)
SELECT t.id, r.id, mi.id
FROM tenants t
CROSS JOIN roles r
CROSS JOIN menu_items mi
WHERE r.code IN ('manager', 'department_representative', 'admin', 'hsse_manager', 'hsse_officer')
AND mi.code IN ('dept_gate_passes', 'dept_gate_pass_dashboard', 'dept_gate_pass_list', 'dept_gate_pass_approvals', 'dept_gate_pass_today')
ON CONFLICT DO NOTHING;