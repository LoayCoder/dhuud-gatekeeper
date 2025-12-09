-- Add new incident status for department representative approval
-- Note: The enum value needs to be committed before it can be used in WHERE clauses
ALTER TYPE incident_status ADD VALUE IF NOT EXISTS 'pending_dept_rep_approval';

-- Add columns for department representative approval tracking
ALTER TABLE incidents 
ADD COLUMN IF NOT EXISTS dept_rep_approved_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS dept_rep_approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS dept_rep_notes TEXT;