-- Create subscription event type enum
CREATE TYPE public.subscription_event_type AS ENUM (
  'plan_changed',
  'trial_started',
  'trial_ended',
  'subscription_activated',
  'subscription_canceled',
  'subscription_renewed',
  'user_limit_changed',
  'payment_succeeded',
  'payment_failed'
);

-- Create subscription events audit log table
CREATE TABLE public.subscription_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  event_type subscription_event_type NOT NULL,
  description TEXT,
  previous_value JSONB,
  new_value JSONB,
  performed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_subscription_events_tenant ON public.subscription_events(tenant_id);
CREATE INDEX idx_subscription_events_created ON public.subscription_events(created_at DESC);

-- Enable RLS
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage subscription events"
ON public.subscription_events
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their tenant subscription events"
ON public.subscription_events
FOR SELECT
USING (tenant_id = get_auth_tenant_id());