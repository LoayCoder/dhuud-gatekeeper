-- Add unique constraint for national_id per tenant (only for non-deleted workers)
-- This prevents duplicate workers with the same national ID within the same organization
CREATE UNIQUE INDEX idx_contractor_workers_tenant_national_id_unique 
ON contractor_workers (tenant_id, national_id) 
WHERE deleted_at IS NULL;