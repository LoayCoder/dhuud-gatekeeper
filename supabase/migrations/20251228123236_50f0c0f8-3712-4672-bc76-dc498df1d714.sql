-- Add report columns to inspection_sessions for automated PDF generation
ALTER TABLE inspection_sessions
ADD COLUMN IF NOT EXISTS report_url TEXT,
ADD COLUMN IF NOT EXISTS report_generated_at TIMESTAMPTZ;

-- Add index for quick lookup of sessions with reports
CREATE INDEX IF NOT EXISTS idx_sessions_report 
ON inspection_sessions(report_generated_at DESC) 
WHERE report_url IS NOT NULL AND deleted_at IS NULL;