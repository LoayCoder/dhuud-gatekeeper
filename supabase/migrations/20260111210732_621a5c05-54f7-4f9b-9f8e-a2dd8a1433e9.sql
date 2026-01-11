-- Add Security Shift Leader role to the hierarchy
-- Hierarchy: Manager (52) > Supervisor (51) > Shift Leader (50) > Guard (49)

INSERT INTO roles (code, name, category, description, sort_order, is_system, is_active, module_access)
VALUES (
  'security_shift_leader',
  'Security Shift Leader',
  'security',
  'Leads security shifts and reports to Security Supervisor',
  50,
  false,
  true,
  ARRAY['security', 'gate_control', 'patrol', 'incidents']
) ON CONFLICT (code) DO NOTHING;

-- Adjust security_guard sort_order to be lowest in hierarchy
UPDATE roles SET sort_order = 49 WHERE code = 'security_guard' AND sort_order != 49;