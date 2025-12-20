-- Add visit duration and QR code token to gate_entry_logs
ALTER TABLE gate_entry_logs 
ADD COLUMN IF NOT EXISTS visit_duration_hours integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS qr_code_token uuid DEFAULT gen_random_uuid();

-- Add HSSE settings and emergency contact to tenants
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS visitor_hsse_instructions_ar text,
ADD COLUMN IF NOT EXISTS visitor_hsse_instructions_en text,
ADD COLUMN IF NOT EXISTS emergency_contact_number text,
ADD COLUMN IF NOT EXISTS emergency_contact_name text;

-- Create index for QR code lookups
CREATE INDEX IF NOT EXISTS idx_gate_entry_logs_qr_token ON gate_entry_logs(qr_code_token) WHERE deleted_at IS NULL;