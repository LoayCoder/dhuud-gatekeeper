-- Add webhook_events column to store event history
ALTER TABLE public.notification_logs 
ADD COLUMN IF NOT EXISTS webhook_events JSONB DEFAULT '[]'::jsonb;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_notification_logs_webhook_events 
ON public.notification_logs USING GIN (webhook_events);

-- Create function to append webhook event
CREATE OR REPLACE FUNCTION public.append_notification_webhook_event(
  p_provider_message_id TEXT,
  p_event JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  UPDATE notification_logs
  SET 
    webhook_events = COALESCE(webhook_events, '[]'::jsonb) || p_event,
    updated_at = NOW()
  WHERE provider_message_id = p_provider_message_id
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;