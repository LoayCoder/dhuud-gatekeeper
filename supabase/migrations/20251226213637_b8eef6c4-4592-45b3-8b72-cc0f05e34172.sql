-- Create partial unique index to support ON CONFLICT clause in seed function
-- This ensures only one active target per KPI code per tenant (soft-deleted records don't count)
CREATE UNIQUE INDEX IF NOT EXISTS kpi_targets_tenant_kpi_active_idx 
ON kpi_targets (tenant_id, kpi_code) 
WHERE deleted_at IS NULL;