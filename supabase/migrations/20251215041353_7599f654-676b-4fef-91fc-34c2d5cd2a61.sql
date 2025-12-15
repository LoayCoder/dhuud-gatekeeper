-- Add host notification tracking columns to gate_entry_logs
ALTER TABLE gate_entry_logs 
ADD COLUMN IF NOT EXISTS host_mobile text,
ADD COLUMN IF NOT EXISTS host_notified_at timestamptz,
ADD COLUMN IF NOT EXISTS notification_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS notify_host boolean DEFAULT true;

-- Add comment for documentation
COMMENT ON COLUMN gate_entry_logs.host_mobile IS 'Host phone number for WhatsApp notification';
COMMENT ON COLUMN gate_entry_logs.host_notified_at IS 'Timestamp when host was notified of visitor arrival';
COMMENT ON COLUMN gate_entry_logs.notification_status IS 'Status of host notification: pending, sent, failed, skipped';
COMMENT ON COLUMN gate_entry_logs.notify_host IS 'Whether to notify host when visitor arrives';