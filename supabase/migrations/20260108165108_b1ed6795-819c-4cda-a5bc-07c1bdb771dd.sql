-- Add onsite tracking to safety officers
ALTER TABLE contractor_safety_officers 
ADD COLUMN IF NOT EXISTS is_onsite boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS last_entry_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS last_exit_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS current_gate_entry_id uuid REFERENCES gate_entry_logs(id);

-- Add onsite tracking to contractor representatives  
ALTER TABLE contractor_representatives 
ADD COLUMN IF NOT EXISTS is_onsite boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS last_entry_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS last_exit_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS current_gate_entry_id uuid REFERENCES gate_entry_logs(id);

-- Add reference columns to gate_entry_logs for personnel identification
ALTER TABLE gate_entry_logs
ADD COLUMN IF NOT EXISTS safety_officer_id uuid REFERENCES contractor_safety_officers(id),
ADD COLUMN IF NOT EXISTS representative_id uuid REFERENCES contractor_representatives(id);

-- Enable realtime for status updates
ALTER PUBLICATION supabase_realtime ADD TABLE contractor_safety_officers;
ALTER PUBLICATION supabase_realtime ADD TABLE contractor_representatives;