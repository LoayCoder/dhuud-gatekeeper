-- Add worker-related columns to gate_entry_logs for unified access logging
ALTER TABLE gate_entry_logs
ADD COLUMN IF NOT EXISTS worker_id UUID REFERENCES contractor_workers(id),
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES contractor_projects(id),
ADD COLUMN IF NOT EXISTS validation_status TEXT,
ADD COLUMN IF NOT EXISTS validation_errors JSONB,
ADD COLUMN IF NOT EXISTS access_type TEXT DEFAULT 'entry';

-- Add index for faster worker lookups
CREATE INDEX IF NOT EXISTS idx_gate_entry_logs_worker_id ON gate_entry_logs(worker_id) WHERE worker_id IS NOT NULL;

-- Add index for validation status filtering
CREATE INDEX IF NOT EXISTS idx_gate_entry_logs_validation_status ON gate_entry_logs(validation_status) WHERE validation_status IS NOT NULL;

-- Add comment for clarity
COMMENT ON COLUMN gate_entry_logs.worker_id IS 'Links to contractor worker for unified access logging';
COMMENT ON COLUMN gate_entry_logs.project_id IS 'Links to contractor project for worker entries';
COMMENT ON COLUMN gate_entry_logs.validation_status IS 'Validation result: valid, warning, or denied';
COMMENT ON COLUMN gate_entry_logs.validation_errors IS 'Array of validation error messages';
COMMENT ON COLUMN gate_entry_logs.access_type IS 'Type of access: entry, exit, or pass-through';