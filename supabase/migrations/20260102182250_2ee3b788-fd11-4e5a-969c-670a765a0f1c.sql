-- Add exit notification timestamp to gate_entry_logs
ALTER TABLE gate_entry_logs 
ADD COLUMN IF NOT EXISTS host_exit_notified_at TIMESTAMPTZ;

-- Add deleted_at to security_blacklist for soft delete (audit trail)
ALTER TABLE security_blacklist 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add index for soft delete queries (only query non-deleted records)
CREATE INDEX IF NOT EXISTS idx_blacklist_active 
ON security_blacklist(tenant_id, deleted_at) WHERE deleted_at IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN security_blacklist.deleted_at IS 'Soft delete timestamp - records are never hard deleted for audit compliance';