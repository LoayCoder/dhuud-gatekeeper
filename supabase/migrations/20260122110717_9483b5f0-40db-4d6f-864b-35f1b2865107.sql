-- Insert Department Gate Pass menu items (global system items)
INSERT INTO menu_items (code, parent_code, url, icon, name, name_ar, sort_order, is_system)
VALUES 
  ('dept_gate_passes', NULL, NULL, 'FileKey', 'Gate Passes', 'تصاريح الدخول', 15, true),
  ('dept_gate_pass_dashboard', 'dept_gate_passes', '/dept-gate-passes', 'LayoutDashboard', 'Dashboard', 'لوحة المعلومات', 1, true),
  ('dept_gate_pass_list', 'dept_gate_passes', '/dept-gate-passes/list', 'List', 'All Passes', 'جميع التصاريح', 2, true),
  ('dept_gate_pass_approvals', 'dept_gate_passes', '/dept-gate-passes/approvals', 'Clock', 'Pending Approvals', 'الموافقات المعلقة', 3, true),
  ('dept_gate_pass_today', 'dept_gate_passes', '/dept-gate-passes/today', 'CalendarCheck', 'Today', 'اليوم', 4, true)
ON CONFLICT (code) DO NOTHING;