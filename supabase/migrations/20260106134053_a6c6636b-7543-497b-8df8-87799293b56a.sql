-- Add menu item for Asset Category Settings (without is_active column)
INSERT INTO menu_items (code, name, name_ar, parent_code, url, icon, sort_order, is_system)
VALUES ('admin_asset_categories', 'Asset Category Settings', 'إعدادات فئات الأصول', 'asset_management', '/admin/asset-categories', 'FolderTree', 47, true)
ON CONFLICT (code) DO NOTHING;