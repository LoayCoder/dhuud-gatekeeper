-- Add whatsapp_template_id FK to incident_notification_matrix
-- This links notification rules to specific WhatsApp templates for customized messaging

ALTER TABLE incident_notification_matrix 
ADD COLUMN IF NOT EXISTS whatsapp_template_id UUID REFERENCES notification_templates(id) ON DELETE SET NULL;

-- Add comment for documentation
COMMENT ON COLUMN incident_notification_matrix.whatsapp_template_id IS 'Links notification rule to a specific WhatsApp template for customized messaging';