-- Fix unique constraint to properly handle both type_id and subtype_id
DROP INDEX IF EXISTS asset_type_parts_unique_code;

-- Create proper unique constraint that includes both type_id and subtype_id
CREATE UNIQUE INDEX asset_type_parts_unique_code 
ON asset_type_parts (
  tenant_id, 
  COALESCE(type_id, '00000000-0000-0000-0000-000000000000'::uuid),
  COALESCE(subtype_id, '00000000-0000-0000-0000-000000000000'::uuid),
  code
) WHERE deleted_at IS NULL;

-- Drop duplicate/conflicting RLS policy if it exists
DROP POLICY IF EXISTS "Users can manage subtype parts within their tenant" ON asset_type_parts;