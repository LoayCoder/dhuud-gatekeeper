-- Add new columns to invitations table for enhanced tracking
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS delivery_status text DEFAULT 'pending';
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS email_sent_at timestamptz;
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS whatsapp_sent_at timestamptz;
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS last_send_error text;
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS delivery_channel text DEFAULT 'email';
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS phone_number text;

-- Add index for faster queries on pending invitations
CREATE INDEX IF NOT EXISTS idx_invitations_delivery_status ON invitations(delivery_status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_invitations_tenant_status ON invitations(tenant_id, delivery_status) WHERE deleted_at IS NULL;