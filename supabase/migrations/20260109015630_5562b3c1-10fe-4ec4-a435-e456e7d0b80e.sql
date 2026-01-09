-- Create incident_injuries table for detailed injury documentation
CREATE TABLE public.incident_injuries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  
  -- Injured person info
  injured_person_name TEXT NOT NULL,
  national_id TEXT,
  is_platform_user BOOLEAN DEFAULT false,
  linked_user_id UUID REFERENCES public.profiles(id),
  linked_contractor_worker_id UUID REFERENCES public.contractor_workers(id),
  
  -- Injury details
  injury_date TIMESTAMPTZ,
  injury_severity TEXT CHECK (injury_severity IN ('minor', 'moderate', 'severe', 'critical')),
  injury_type TEXT[],
  injury_description TEXT,
  body_parts_affected TEXT[],
  
  -- Body diagram data (JSON with marked areas for each view)
  body_diagram_data JSONB DEFAULT '{"front": [], "back": [], "left": [], "right": []}',
  
  -- Treatment info
  first_aid_provided BOOLEAN DEFAULT false,
  first_aid_description TEXT,
  medical_attention_required BOOLEAN DEFAULT false,
  hospitalized BOOLEAN DEFAULT false,
  days_lost INTEGER DEFAULT 0,
  restricted_duty_days INTEGER DEFAULT 0,
  
  -- Data entry tracking
  recorded_by UUID REFERENCES public.profiles(id),
  recorder_role TEXT CHECK (recorder_role IN ('investigator', 'medical_staff', 'first_aider')),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.incident_injuries ENABLE ROW LEVEL SECURITY;

-- RLS policies for tenant isolation
CREATE POLICY "incident_injuries_select" ON public.incident_injuries
  FOR SELECT USING (
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    AND deleted_at IS NULL
  );

CREATE POLICY "incident_injuries_insert" ON public.incident_injuries
  FOR INSERT WITH CHECK (
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "incident_injuries_update" ON public.incident_injuries
  FOR UPDATE USING (
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    AND deleted_at IS NULL
  );

CREATE POLICY "incident_injuries_delete" ON public.incident_injuries
  FOR DELETE USING (
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  );

-- Index for performance
CREATE INDEX idx_incident_injuries_incident ON public.incident_injuries(incident_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_incident_injuries_tenant ON public.incident_injuries(tenant_id) WHERE deleted_at IS NULL;

-- Trigger for updated_at
CREATE TRIGGER update_incident_injuries_updated_at
  BEFORE UPDATE ON public.incident_injuries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();