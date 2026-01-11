-- Add user reference and scope columns to gate_pass_approvers
ALTER TABLE gate_pass_approvers
ADD COLUMN user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
ADD COLUMN approver_scope text DEFAULT 'both' CHECK (approver_scope IN ('external', 'internal', 'both'));

-- Create indexes for faster lookups
CREATE INDEX idx_gate_pass_approvers_user_id ON gate_pass_approvers(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_gate_pass_approvers_scope ON gate_pass_approvers(approver_scope) WHERE deleted_at IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN gate_pass_approvers.user_id IS 'References actual user who can approve gate passes';
COMMENT ON COLUMN gate_pass_approvers.approver_scope IS 'Determines visibility: external (contractors), internal (employees), or both';