-- Add reporter_branch_id column to incidents table
-- This stores the reporter's home branch for workflow routing
-- while branch_id stores where the observation occurred

ALTER TABLE incidents 
ADD COLUMN IF NOT EXISTS reporter_branch_id uuid REFERENCES branches(id);

COMMENT ON COLUMN incidents.reporter_branch_id IS 'The home branch of the reporter. Used for workflow routing.';
COMMENT ON COLUMN incidents.branch_id IS 'The branch where the observation/incident occurred (from site location).';