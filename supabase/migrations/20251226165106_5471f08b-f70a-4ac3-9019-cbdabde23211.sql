-- Add channel_type column to notification_templates
ALTER TABLE public.notification_templates 
ADD COLUMN channel_type TEXT NOT NULL DEFAULT 'whatsapp' 
CHECK (channel_type IN ('whatsapp', 'email', 'both'));

-- Add email_subject column for email templates
ALTER TABLE public.notification_templates 
ADD COLUMN email_subject TEXT;