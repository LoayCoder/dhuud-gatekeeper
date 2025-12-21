-- Insert role_menu_access records for WhatsApp menu items to Admin role
INSERT INTO role_menu_access (tenant_id, role_id, menu_item_id)
SELECT DISTINCT
  t.id as tenant_id,
  r.id as role_id,
  mi.id as menu_item_id
FROM menu_items mi
CROSS JOIN tenants t
CROSS JOIN roles r
WHERE mi.code IN ('admin_whatsapp', 'admin_whatsapp_settings', 'admin_whatsapp_templates')
  AND r.code = 'admin'
ON CONFLICT DO NOTHING;