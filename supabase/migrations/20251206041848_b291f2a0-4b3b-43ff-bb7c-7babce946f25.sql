
-- Create special_events table for Major Events feature
CREATE TABLE public.special_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Add special_event_id to incidents table
ALTER TABLE public.incidents 
ADD COLUMN special_event_id UUID REFERENCES public.special_events(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.special_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage special events"
ON public.special_events
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_auth_tenant_id());

CREATE POLICY "Users can view active special events in their tenant"
ON public.special_events
FOR SELECT
USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL);

-- Performance indexes
CREATE INDEX idx_special_events_tenant_active ON public.special_events(tenant_id, is_active, start_at, end_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_special_events_deleted_at ON public.special_events(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_incidents_special_event_id ON public.incidents(special_event_id) WHERE special_event_id IS NOT NULL;

-- Trigger for updated_at
CREATE TRIGGER update_special_events_updated_at
  BEFORE UPDATE ON public.special_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
