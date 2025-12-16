-- Create push notification preferences table
CREATE TABLE public.push_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  
  -- HSSE Notification Types
  incidents_new BOOLEAN DEFAULT true,
  incidents_assigned BOOLEAN DEFAULT true,
  incidents_status_change BOOLEAN DEFAULT true,
  
  approvals_requested BOOLEAN DEFAULT true,
  approvals_decision BOOLEAN DEFAULT true,
  
  sla_warnings BOOLEAN DEFAULT true,
  sla_overdue BOOLEAN DEFAULT true,
  sla_escalations BOOLEAN DEFAULT true,
  
  -- General Types
  system_announcements BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.push_notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only manage their own preferences
CREATE POLICY "Users manage own notification preferences"
  ON public.push_notification_preferences FOR ALL
  USING (user_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_push_notification_preferences_updated_at
  BEFORE UPDATE ON public.push_notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to auto-create preferences when user subscribes to push
CREATE OR REPLACE FUNCTION public.create_default_notification_preferences()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.push_notification_preferences (user_id, tenant_id)
  SELECT NEW.user_id, NEW.tenant_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.push_notification_preferences 
    WHERE user_id = NEW.user_id
  );
  RETURN NEW;
END;
$$;

-- Trigger to auto-create preferences on push subscription
CREATE TRIGGER create_notification_prefs_on_subscription
  AFTER INSERT ON public.push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_notification_preferences();

-- Index for faster lookups
CREATE INDEX idx_push_notification_preferences_user_id 
  ON public.push_notification_preferences(user_id);