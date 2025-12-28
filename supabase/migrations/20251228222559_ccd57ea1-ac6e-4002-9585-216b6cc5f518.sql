-- Create emergency_alerts table for panic button system
CREATE TABLE public.emergency_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  guard_id UUID REFERENCES public.profiles(id),
  alert_type TEXT NOT NULL DEFAULT 'panic' CHECK (alert_type IN ('panic', 'duress', 'medical', 'fire', 'security_breach')),
  priority TEXT NOT NULL DEFAULT 'critical' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  accuracy NUMERIC(10, 2),
  location_description TEXT,
  triggered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  acknowledged_by UUID REFERENCES public.profiles(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES public.profiles(id),
  resolution_notes TEXT,
  is_false_alarm BOOLEAN DEFAULT false,
  response_time_seconds INTEGER,
  notes TEXT,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create shift_handovers table
CREATE TABLE public.shift_handovers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  outgoing_guard_id UUID NOT NULL REFERENCES public.profiles(id),
  incoming_guard_id UUID REFERENCES public.profiles(id),
  shift_date DATE NOT NULL DEFAULT CURRENT_DATE,
  zone_id UUID REFERENCES public.security_zones(id),
  handover_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'completed', 'cancelled')),
  outstanding_issues JSONB DEFAULT '[]'::jsonb,
  equipment_checklist JSONB DEFAULT '[]'::jsonb,
  key_observations TEXT,
  visitor_info TEXT,
  next_shift_priorities TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create guard_performance_metrics table for analytics
CREATE TABLE public.guard_performance_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  guard_id UUID NOT NULL REFERENCES public.profiles(id),
  metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
  patrols_completed INTEGER DEFAULT 0,
  patrols_assigned INTEGER DEFAULT 0,
  checkpoints_verified INTEGER DEFAULT 0,
  checkpoints_missed INTEGER DEFAULT 0,
  avg_checkpoint_time_seconds INTEGER,
  incidents_reported INTEGER DEFAULT 0,
  incidents_resolved INTEGER DEFAULT 0,
  geofence_violations INTEGER DEFAULT 0,
  shift_punctuality_minutes INTEGER DEFAULT 0,
  emergency_response_time_seconds INTEGER,
  handovers_completed INTEGER DEFAULT 0,
  overall_score NUMERIC(5, 2),
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, guard_id, metric_date)
);

-- Enable RLS
ALTER TABLE public.emergency_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_handovers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guard_performance_metrics ENABLE ROW LEVEL SECURITY;

-- RLS policies for emergency_alerts
CREATE POLICY "Users can view their tenant's emergency alerts"
  ON public.emergency_alerts FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create emergency alerts for their tenant"
  ON public.emergency_alerts FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their tenant's emergency alerts"
  ON public.emergency_alerts FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- RLS policies for shift_handovers
CREATE POLICY "Users can view their tenant's shift handovers"
  ON public.shift_handovers FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create shift handovers for their tenant"
  ON public.shift_handovers FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their tenant's shift handovers"
  ON public.shift_handovers FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- RLS policies for guard_performance_metrics
CREATE POLICY "Users can view their tenant's guard performance"
  ON public.guard_performance_metrics FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert guard performance for their tenant"
  ON public.guard_performance_metrics FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their tenant's guard performance"
  ON public.guard_performance_metrics FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- Create indexes for better performance
CREATE INDEX idx_emergency_alerts_tenant ON public.emergency_alerts(tenant_id);
CREATE INDEX idx_emergency_alerts_guard ON public.emergency_alerts(guard_id);
CREATE INDEX idx_emergency_alerts_triggered ON public.emergency_alerts(triggered_at DESC);
CREATE INDEX idx_emergency_alerts_status ON public.emergency_alerts(acknowledged_at, resolved_at) WHERE deleted_at IS NULL;

CREATE INDEX idx_shift_handovers_tenant ON public.shift_handovers(tenant_id);
CREATE INDEX idx_shift_handovers_date ON public.shift_handovers(shift_date DESC);
CREATE INDEX idx_shift_handovers_guards ON public.shift_handovers(outgoing_guard_id, incoming_guard_id);

CREATE INDEX idx_guard_performance_tenant ON public.guard_performance_metrics(tenant_id);
CREATE INDEX idx_guard_performance_guard ON public.guard_performance_metrics(guard_id);
CREATE INDEX idx_guard_performance_date ON public.guard_performance_metrics(metric_date DESC);

-- Enable realtime for emergency_alerts
ALTER PUBLICATION supabase_realtime ADD TABLE public.emergency_alerts;

-- Create updated_at trigger for shift_handovers
CREATE TRIGGER update_shift_handovers_updated_at
  BEFORE UPDATE ON public.shift_handovers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create updated_at trigger for guard_performance_metrics
CREATE TRIGGER update_guard_performance_updated_at
  BEFORE UPDATE ON public.guard_performance_metrics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();