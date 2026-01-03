-- Add columns for worker/visitor notification support to hsse_notifications
ALTER TABLE public.hsse_notifications
ADD COLUMN IF NOT EXISTS include_workers_on_site BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS include_visitors_on_site BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS worker_whatsapp_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS visitor_whatsapp_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS worker_messages_sent INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS visitor_messages_sent INTEGER DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN public.hsse_notifications.include_workers_on_site IS 'When true, workers currently on site receive WhatsApp notification';
COMMENT ON COLUMN public.hsse_notifications.include_visitors_on_site IS 'When true, visitors currently on site receive WhatsApp notification';
COMMENT ON COLUMN public.hsse_notifications.worker_whatsapp_sent_at IS 'Timestamp when WhatsApp messages were sent to workers';
COMMENT ON COLUMN public.hsse_notifications.visitor_whatsapp_sent_at IS 'Timestamp when WhatsApp messages were sent to visitors';
COMMENT ON COLUMN public.hsse_notifications.worker_messages_sent IS 'Count of WhatsApp messages sent to workers';
COMMENT ON COLUMN public.hsse_notifications.visitor_messages_sent IS 'Count of WhatsApp messages sent to visitors';