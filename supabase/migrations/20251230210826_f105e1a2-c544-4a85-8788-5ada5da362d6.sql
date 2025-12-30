-- Add email_template_id column to incident_notification_matrix
ALTER TABLE public.incident_notification_matrix 
ADD COLUMN IF NOT EXISTS email_template_id uuid 
REFERENCES public.notification_templates(id) ON DELETE SET NULL;