-- Phase 2: Add HSSE Validation columns for observation workflow
-- Supports the 3-scenario workflow: Close on Spot (L1-2), HSSE Review (L3-4), Manager Closure (L5)

-- Add HSSE validation tracking columns
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS hsse_validation_status TEXT;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS hsse_validated_by UUID REFERENCES profiles(id);
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS hsse_validated_at TIMESTAMPTZ;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS hsse_validation_notes TEXT;

-- Add closure lock flag for Level 5 (Catastrophic) - requires HSSE Manager approval
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS closure_requires_manager BOOLEAN DEFAULT FALSE;

-- Add check constraint to ensure only valid severity levels
ALTER TABLE incidents DROP CONSTRAINT IF EXISTS check_valid_severity_v2;
ALTER TABLE incidents 
ADD CONSTRAINT check_valid_severity_v2 
CHECK (severity_v2 IS NULL OR severity_v2 IN ('level_1', 'level_2', 'level_3', 'level_4', 'level_5'));

-- Add check constraint for HSSE validation status
ALTER TABLE incidents DROP CONSTRAINT IF EXISTS check_valid_hsse_validation_status;
ALTER TABLE incidents 
ADD CONSTRAINT check_valid_hsse_validation_status 
CHECK (hsse_validation_status IS NULL OR hsse_validation_status IN ('pending', 'accepted', 'rejected'));

-- Add new status values if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'pending_hsse_validation' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'incident_status')) THEN
    ALTER TYPE incident_status ADD VALUE 'pending_hsse_validation';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'pending_final_closure' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'incident_status')) THEN
    ALTER TYPE incident_status ADD VALUE 'pending_final_closure';
  END IF;
END $$;

-- Create index for HSSE validation queries
CREATE INDEX IF NOT EXISTS idx_incidents_hsse_validation 
ON incidents(hsse_validation_status) 
WHERE hsse_validation_status IS NOT NULL AND deleted_at IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN incidents.hsse_validation_status IS 'HSSE Expert validation status: pending, accepted, rejected';
COMMENT ON COLUMN incidents.closure_requires_manager IS 'Level 5 incidents require HSSE Manager approval to close';