-- Add template tracking columns to auto_notification_logs
ALTER TABLE auto_notification_logs 
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES notification_templates(id),
ADD COLUMN IF NOT EXISTS template_source TEXT CHECK (template_source IN ('matrix', 'default', 'fallback'));

-- Add push template support to incident_notification_matrix
ALTER TABLE incident_notification_matrix 
ADD COLUMN IF NOT EXISTS push_template_id UUID REFERENCES notification_templates(id);

-- Add comment for documentation
COMMENT ON COLUMN auto_notification_logs.template_id IS 'The notification template used for this notification';
COMMENT ON COLUMN auto_notification_logs.template_source IS 'How the template was resolved: matrix (from matrix rule), default (system default by slug), fallback (hardcoded generator)';
COMMENT ON COLUMN incident_notification_matrix.push_template_id IS 'Optional template for push notifications';