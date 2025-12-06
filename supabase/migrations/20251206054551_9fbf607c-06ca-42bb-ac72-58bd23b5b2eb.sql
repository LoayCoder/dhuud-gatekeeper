-- Add severity change workflow columns to incidents table
ALTER TABLE incidents
ADD COLUMN IF NOT EXISTS original_severity severity_level,
ADD COLUMN IF NOT EXISTS severity_pending_approval boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS severity_change_justification text,
ADD COLUMN IF NOT EXISTS severity_approved_by uuid,
ADD COLUMN IF NOT EXISTS severity_approved_at timestamptz;

-- Add index for pending approval queries
CREATE INDEX IF NOT EXISTS idx_incidents_severity_pending 
ON incidents(tenant_id, severity_pending_approval) 
WHERE severity_pending_approval = true;

-- Comment on columns for documentation
COMMENT ON COLUMN incidents.original_severity IS 'Original severity before any changes, set when severity_pending_approval becomes true';
COMMENT ON COLUMN incidents.severity_pending_approval IS 'Whether a severity change is pending HSSE Manager approval';
COMMENT ON COLUMN incidents.severity_change_justification IS 'Justification text for the proposed severity change';
COMMENT ON COLUMN incidents.severity_approved_by IS 'User ID of HSSE Manager who approved/rejected the change';
COMMENT ON COLUMN incidents.severity_approved_at IS 'Timestamp when severity change was approved/rejected';