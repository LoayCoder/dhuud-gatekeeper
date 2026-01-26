-- =============================================
-- Fix Build Errors: Create Missing Tables & Columns
-- =============================================

-- 1. Create incident_rca table for Root Cause Analysis data
CREATE TABLE IF NOT EXISTS public.incident_rca (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  five_whys JSONB DEFAULT '[]'::jsonb,
  root_causes JSONB DEFAULT '[]'::jsonb,
  contributing_factors JSONB DEFAULT '[]'::jsonb,
  immediate_causes TEXT[] DEFAULT '{}'::text[],
  underlying_causes TEXT[] DEFAULT '{}'::text[],
  is_locked BOOLEAN DEFAULT FALSE,
  locked_at TIMESTAMPTZ,
  locked_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(incident_id)
);

-- Enable RLS on incident_rca
ALTER TABLE public.incident_rca ENABLE ROW LEVEL SECURITY;

-- RLS policies for incident_rca (tenant isolation)
CREATE POLICY "incident_rca_tenant_isolation_select" ON public.incident_rca
  FOR SELECT USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "incident_rca_tenant_isolation_insert" ON public.incident_rca
  FOR INSERT WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "incident_rca_tenant_isolation_update" ON public.incident_rca
  FOR UPDATE USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "incident_rca_tenant_isolation_delete" ON public.incident_rca
  FOR DELETE USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- 2. Create incident_evidence table for evidence storage
CREATE TABLE IF NOT EXISTS public.incident_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  evidence_type TEXT NOT NULL,
  file_url TEXT,
  file_name TEXT,
  file_size INTEGER,
  mime_type TEXT,
  cctv_metadata JSONB,
  description TEXT,
  review_comment TEXT,
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  uploaded_by UUID REFERENCES public.profiles(id),
  is_soft_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on incident_evidence
ALTER TABLE public.incident_evidence ENABLE ROW LEVEL SECURITY;

-- RLS policies for incident_evidence (tenant isolation)
CREATE POLICY "incident_evidence_tenant_isolation_select" ON public.incident_evidence
  FOR SELECT USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "incident_evidence_tenant_isolation_insert" ON public.incident_evidence
  FOR INSERT WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "incident_evidence_tenant_isolation_update" ON public.incident_evidence
  FOR UPDATE USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "incident_evidence_tenant_isolation_delete" ON public.incident_evidence
  FOR DELETE USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- 3. Add missing column to incidents table
ALTER TABLE public.incidents 
ADD COLUMN IF NOT EXISTS assigned_environmental_expert_id UUID REFERENCES public.profiles(id);

-- 4. Create helper function for unlocking RCA (referenced in code)
CREATE OR REPLACE FUNCTION public.unlock_rca(p_incident_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.incident_rca
  SET is_locked = FALSE, locked_at = NULL, locked_by = NULL, updated_at = NOW()
  WHERE incident_id = p_incident_id
    AND tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid());
  
  RETURN FOUND;
END;
$$;

-- 5. Create helper function for soft deleting evidence
CREATE OR REPLACE FUNCTION public.soft_delete_incident_evidence(p_evidence_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.incident_evidence
  SET is_soft_deleted = TRUE, deleted_at = NOW()
  WHERE id = p_evidence_id
    AND tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid());
  
  RETURN FOUND;
END;
$$;

-- 6. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_incident_rca_incident_id ON public.incident_rca(incident_id);
CREATE INDEX IF NOT EXISTS idx_incident_rca_tenant_id ON public.incident_rca(tenant_id);
CREATE INDEX IF NOT EXISTS idx_incident_evidence_incident_id ON public.incident_evidence(incident_id);
CREATE INDEX IF NOT EXISTS idx_incident_evidence_tenant_id ON public.incident_evidence(tenant_id);
CREATE INDEX IF NOT EXISTS idx_incidents_assigned_env_expert ON public.incidents(assigned_environmental_expert_id);