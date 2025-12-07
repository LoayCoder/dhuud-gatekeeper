
-- Add 'asset_management' to the admin role's module_access array
UPDATE roles 
SET module_access = array_append(module_access, 'asset_management')
WHERE code = 'admin' 
AND NOT ('asset_management' = ANY(module_access));
