-- Fix duplicate zone codes first by appending partial ID
UPDATE security_zones 
SET zone_code = zone_code || '-' || LEFT(id::text, 4)
WHERE id IN (
  SELECT id FROM (
    SELECT id, zone_code, tenant_id,
           ROW_NUMBER() OVER (PARTITION BY tenant_id, zone_code ORDER BY created_at DESC) as rn
    FROM security_zones
    WHERE deleted_at IS NULL
  ) sub WHERE rn > 1
);

-- Add unique constraint per tenant (only for non-deleted zones)
CREATE UNIQUE INDEX security_zones_zone_code_tenant_unique 
ON security_zones (tenant_id, zone_code) 
WHERE deleted_at IS NULL;