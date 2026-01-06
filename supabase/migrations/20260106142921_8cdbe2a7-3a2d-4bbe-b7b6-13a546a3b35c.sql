-- Grant admin_asset_categories access to appropriate roles
-- Use tenant_id from existing role_menu_access entries for the same role
INSERT INTO role_menu_access (tenant_id, role_id, menu_item_id)
SELECT DISTINCT rma_existing.tenant_id, r.id, mi.id
FROM roles r
CROSS JOIN menu_items mi
INNER JOIN role_menu_access rma_existing ON rma_existing.role_id = r.id
WHERE mi.code = 'admin_asset_categories'
  AND r.code IN ('admin', 'hsse_manager', 'hsse_expert')
  AND NOT EXISTS (
    SELECT 1 FROM role_menu_access rma 
    WHERE rma.role_id = r.id AND rma.menu_item_id = mi.id AND rma.tenant_id = rma_existing.tenant_id
  );