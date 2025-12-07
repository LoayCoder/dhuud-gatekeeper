
-- =====================================================
-- Phase 11C.1: Inspection Sessions + Bulk QR Workflow
-- =====================================================

-- 1. Create inspection_sessions table
CREATE TABLE public.inspection_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  
  -- Session Configuration
  session_type TEXT NOT NULL DEFAULT 'asset' CHECK (session_type IN ('asset', 'area', 'audit')),
  template_id UUID NOT NULL REFERENCES inspection_templates(id),
  period TEXT NOT NULL,
  
  -- Location Scope (optional filters)
  site_id UUID REFERENCES sites(id),
  building_id UUID REFERENCES buildings(id),
  floor_zone_id UUID REFERENCES floors_zones(id),
  category_id UUID REFERENCES asset_categories(id),
  type_id UUID REFERENCES asset_types(id),
  
  -- Session State
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'completed_with_open_actions', 'closed')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  
  -- Results
  total_assets INTEGER DEFAULT 0,
  inspected_count INTEGER DEFAULT 0,
  passed_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  not_accessible_count INTEGER DEFAULT 0,
  compliance_percentage NUMERIC(5,2),
  
  -- AI Summary
  ai_summary TEXT,
  ai_summary_generated_at TIMESTAMPTZ,
  
  -- Inspector
  inspector_id UUID NOT NULL REFERENCES profiles(id),
  reference_id TEXT,
  
  -- Audit Fields
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- 2. Create inspection_session_assets table
CREATE TABLE public.inspection_session_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  session_id UUID NOT NULL REFERENCES inspection_sessions(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES hsse_assets(id),
  
  -- Quick Inspection Result
  quick_result TEXT CHECK (quick_result IN ('good', 'not_good', 'not_accessible')),
  failure_reason TEXT,
  notes TEXT,
  
  -- Location Data (captured at inspection time)
  gps_lat DOUBLE PRECISION,
  gps_lng DOUBLE PRECISION,
  
  -- Photos (array of storage paths)
  photo_paths JSONB DEFAULT '[]',
  
  -- Timestamps
  inspected_at TIMESTAMPTZ,
  inspected_by UUID REFERENCES profiles(id),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(session_id, asset_id)
);

-- 3. Create inspection_findings table
CREATE TABLE public.inspection_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  
  -- Links
  session_id UUID NOT NULL REFERENCES inspection_sessions(id) ON DELETE CASCADE,
  session_asset_id UUID REFERENCES inspection_session_assets(id) ON DELETE SET NULL,
  asset_id UUID REFERENCES hsse_assets(id),
  
  -- Classification
  classification TEXT NOT NULL DEFAULT 'observation' CHECK (classification IN ('minor_nc', 'major_nc', 'critical_nc', 'observation', 'ofi')),
  risk_level TEXT DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  
  -- Details
  description TEXT NOT NULL,
  ai_generated_description TEXT,
  
  -- Linked Action
  action_id UUID REFERENCES corrective_actions(id),
  
  -- Status
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'action_assigned', 'action_completed', 'closed')),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- 4. Alter corrective_actions to add finding_id and session_id
ALTER TABLE public.corrective_actions 
ADD COLUMN IF NOT EXISTS finding_id UUID REFERENCES inspection_findings(id),
ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES inspection_sessions(id);

-- 5. Enable RLS on all new tables
ALTER TABLE public.inspection_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_session_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_findings ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for inspection_sessions
CREATE POLICY "Users can view sessions in their tenant" 
ON public.inspection_sessions FOR SELECT 
USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL);

CREATE POLICY "HSSE users can create sessions" 
ON public.inspection_sessions FOR INSERT 
WITH CHECK (tenant_id = get_auth_tenant_id() AND has_asset_management_access(auth.uid()));

CREATE POLICY "HSSE users can update sessions" 
ON public.inspection_sessions FOR UPDATE 
USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL AND has_asset_management_access(auth.uid()));

CREATE POLICY "Admins can delete sessions" 
ON public.inspection_sessions FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_auth_tenant_id());

-- 7. RLS Policies for inspection_session_assets
CREATE POLICY "Users can view session assets in their tenant" 
ON public.inspection_session_assets FOR SELECT 
USING (tenant_id = get_auth_tenant_id());

CREATE POLICY "HSSE users can create session assets" 
ON public.inspection_session_assets FOR INSERT 
WITH CHECK (tenant_id = get_auth_tenant_id() AND has_asset_management_access(auth.uid()));

CREATE POLICY "HSSE users can update session assets" 
ON public.inspection_session_assets FOR UPDATE 
USING (tenant_id = get_auth_tenant_id() AND has_asset_management_access(auth.uid()));

CREATE POLICY "Admins can delete session assets" 
ON public.inspection_session_assets FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_auth_tenant_id());

-- 8. RLS Policies for inspection_findings
CREATE POLICY "Users can view findings in their tenant" 
ON public.inspection_findings FOR SELECT 
USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL);

CREATE POLICY "HSSE users can create findings" 
ON public.inspection_findings FOR INSERT 
WITH CHECK (tenant_id = get_auth_tenant_id() AND has_asset_management_access(auth.uid()));

CREATE POLICY "HSSE users can update findings" 
ON public.inspection_findings FOR UPDATE 
USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL AND has_asset_management_access(auth.uid()));

CREATE POLICY "Admins can delete findings" 
ON public.inspection_findings FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_auth_tenant_id());

-- 9. Indexes for performance
CREATE INDEX idx_inspection_sessions_tenant_status ON public.inspection_sessions(tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_inspection_sessions_inspector ON public.inspection_sessions(inspector_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_inspection_sessions_site ON public.inspection_sessions(site_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_inspection_session_assets_session ON public.inspection_session_assets(session_id);
CREATE INDEX idx_inspection_session_assets_asset ON public.inspection_session_assets(asset_id);
CREATE INDEX idx_inspection_session_assets_result ON public.inspection_session_assets(session_id, quick_result);
CREATE INDEX idx_inspection_findings_session ON public.inspection_findings(session_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_inspection_findings_status ON public.inspection_findings(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_corrective_actions_finding ON public.corrective_actions(finding_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_corrective_actions_session ON public.corrective_actions(session_id) WHERE deleted_at IS NULL;

-- 10. Trigger function to generate session reference ID
CREATE OR REPLACE FUNCTION public.generate_session_reference_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  year_suffix TEXT;
  sequence_num INTEGER;
BEGIN
  year_suffix := TO_CHAR(NOW(), 'YYYY');
  
  SELECT COALESCE(MAX(
    CAST(NULLIF(SPLIT_PART(reference_id, '-', 3), '') AS INTEGER)
  ), 0) + 1
  INTO sequence_num
  FROM inspection_sessions
  WHERE tenant_id = NEW.tenant_id
    AND reference_id LIKE 'INS-' || year_suffix || '-%';
  
  NEW.reference_id := 'INS-' || year_suffix || '-' || LPAD(sequence_num::text, 4, '0');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER generate_session_reference_id_trigger
BEFORE INSERT ON public.inspection_sessions
FOR EACH ROW
EXECUTE FUNCTION public.generate_session_reference_id();

-- 11. Trigger function to update session counts
CREATE OR REPLACE FUNCTION public.update_session_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_id UUID;
  v_total INTEGER;
  v_inspected INTEGER;
  v_passed INTEGER;
  v_failed INTEGER;
  v_not_accessible INTEGER;
  v_compliance NUMERIC(5,2);
BEGIN
  v_session_id := COALESCE(NEW.session_id, OLD.session_id);
  
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE quick_result IS NOT NULL),
    COUNT(*) FILTER (WHERE quick_result = 'good'),
    COUNT(*) FILTER (WHERE quick_result = 'not_good'),
    COUNT(*) FILTER (WHERE quick_result = 'not_accessible')
  INTO v_total, v_inspected, v_passed, v_failed, v_not_accessible
  FROM inspection_session_assets
  WHERE session_id = v_session_id;
  
  -- Calculate compliance: passed / (passed + failed) * 100
  IF (v_passed + v_failed) > 0 THEN
    v_compliance := ROUND((v_passed::NUMERIC / (v_passed + v_failed)::NUMERIC) * 100, 2);
  ELSE
    v_compliance := NULL;
  END IF;
  
  UPDATE inspection_sessions
  SET 
    total_assets = v_total,
    inspected_count = v_inspected,
    passed_count = v_passed,
    failed_count = v_failed,
    not_accessible_count = v_not_accessible,
    compliance_percentage = v_compliance,
    updated_at = now()
  WHERE id = v_session_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER update_session_counts_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.inspection_session_assets
FOR EACH ROW
EXECUTE FUNCTION public.update_session_counts();

-- 12. Trigger to update updated_at on sessions
CREATE TRIGGER update_inspection_sessions_updated_at
BEFORE UPDATE ON public.inspection_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 13. Trigger to update updated_at on session_assets
CREATE TRIGGER update_inspection_session_assets_updated_at
BEFORE UPDATE ON public.inspection_session_assets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 14. Trigger to update updated_at on findings
CREATE TRIGGER update_inspection_findings_updated_at
BEFORE UPDATE ON public.inspection_findings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
