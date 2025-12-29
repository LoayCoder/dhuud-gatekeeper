-- Add Cold Work permit type as a global template
INSERT INTO ptw_types (
  id, tenant_id, name, name_ar, code, risk_level,
  requires_gas_test, requires_loto, validity_hours,
  icon_name, color, is_active, sort_order, created_at
) VALUES (
  gen_random_uuid(), NULL, 'Cold Work', 'الأعمال الباردة', 'COLD_WORK', 'low',
  false, false, 12,
  'wrench', 'gray', true, 8, now()
);