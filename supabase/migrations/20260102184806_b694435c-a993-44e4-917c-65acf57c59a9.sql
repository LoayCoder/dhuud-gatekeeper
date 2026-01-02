-- Emergency response protocols table
CREATE TABLE public.emergency_response_protocols (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  alert_type TEXT NOT NULL,
  protocol_name TEXT NOT NULL,
  protocol_name_ar TEXT,
  steps JSONB NOT NULL DEFAULT '[]',
  sla_minutes INTEGER DEFAULT 15,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Emergency protocol execution log
CREATE TABLE public.emergency_protocol_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  alert_id UUID NOT NULL REFERENCES public.emergency_alerts(id),
  protocol_id UUID REFERENCES public.emergency_response_protocols(id),
  status TEXT DEFAULT 'new',
  started_at TIMESTAMPTZ DEFAULT now(),
  started_by UUID REFERENCES public.profiles(id),
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES public.profiles(id),
  escalation_reason TEXT,
  escalated_at TIMESTAMPTZ,
  escalated_to UUID REFERENCES public.profiles(id),
  steps_completed JSONB DEFAULT '[]',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Add visitor emergency fields to emergency_alerts
ALTER TABLE public.emergency_alerts 
  ADD COLUMN IF NOT EXISTS source_type TEXT,
  ADD COLUMN IF NOT EXISTS source_id UUID,
  ADD COLUMN IF NOT EXISTS source_name TEXT,
  ADD COLUMN IF NOT EXISTS photo_evidence_path TEXT;

-- Extend blacklist for all entity types  
ALTER TABLE public.security_blacklist 
  ADD COLUMN IF NOT EXISTS entity_type TEXT DEFAULT 'visitor',
  ADD COLUMN IF NOT EXISTS entity_id UUID;

-- Update existing blacklist entries to have entity_type
UPDATE public.security_blacklist SET entity_type = 'visitor' WHERE entity_type IS NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_emergency_protocols_tenant ON public.emergency_response_protocols(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_emergency_protocols_type ON public.emergency_response_protocols(tenant_id, alert_type) WHERE deleted_at IS NULL AND is_active = true;
CREATE INDEX IF NOT EXISTS idx_protocol_executions_alert ON public.emergency_protocol_executions(alert_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_protocol_executions_status ON public.emergency_protocol_executions(tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_blacklist_entity ON public.security_blacklist(tenant_id, entity_type, national_id) WHERE deleted_at IS NULL;

-- Enable RLS
ALTER TABLE public.emergency_response_protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_protocol_executions ENABLE ROW LEVEL SECURITY;

-- RLS policies for emergency_response_protocols
CREATE POLICY "Users can view protocols for their tenant" ON public.emergency_response_protocols
  FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert protocols for their tenant" ON public.emergency_response_protocols
  FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update protocols for their tenant" ON public.emergency_response_protocols
  FOR UPDATE USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- RLS policies for emergency_protocol_executions
CREATE POLICY "Users can view executions for their tenant" ON public.emergency_protocol_executions
  FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert executions for their tenant" ON public.emergency_protocol_executions
  FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update executions for their tenant" ON public.emergency_protocol_executions
  FOR UPDATE USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- Enable realtime for emergency tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.emergency_protocol_executions;

-- Add comments
COMMENT ON TABLE public.emergency_response_protocols IS 'Defines step-by-step emergency response protocols by alert type';
COMMENT ON TABLE public.emergency_protocol_executions IS 'Tracks execution of emergency protocols with step completion timestamps';
COMMENT ON COLUMN public.emergency_alerts.source_type IS 'Origin of alert: guard, visitor, or worker';
COMMENT ON COLUMN public.security_blacklist.entity_type IS 'Type of blacklisted entity: visitor, worker, or contractor';