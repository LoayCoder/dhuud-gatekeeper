-- Add acknowledgment columns to shift_roster table
ALTER TABLE shift_roster
ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS auto_acknowledged BOOLEAN DEFAULT false;

-- Add index for efficient querying of unacknowledged shifts
CREATE INDEX IF NOT EXISTS idx_shift_roster_acknowledgment 
ON shift_roster(assigned_at, acknowledged_at) 
WHERE deleted_at IS NULL AND acknowledged_at IS NULL;

-- Add index for guard's upcoming shifts query
CREATE INDEX IF NOT EXISTS idx_shift_roster_guard_date 
ON shift_roster(guard_id, roster_date) 
WHERE deleted_at IS NULL;