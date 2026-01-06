-- Grant Admin role access to admin_app_updates for all tenants
INSERT INTO role_menu_access (tenant_id, role_id, menu_item_id, created_at)
SELECT 
  tenant_id,
  '67c1e03d-3dd7-4f26-aba2-fbea37a3d952' AS role_id,
  '6e809b4e-e1b9-472f-9fcb-00ba12ecb351' AS menu_item_id,
  NOW() AS created_at
FROM (
  SELECT DISTINCT tenant_id 
  FROM role_menu_access 
  WHERE tenant_id IS NOT NULL
) tenants
ON CONFLICT DO NOTHING;