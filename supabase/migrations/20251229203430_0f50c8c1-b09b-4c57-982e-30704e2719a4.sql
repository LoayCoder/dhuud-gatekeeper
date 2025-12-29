-- =============================================
-- RISK ASSESSMENT & CLEARANCE SYSTEM SCHEMA
-- =============================================

-- 1. Risk Assessment Templates
CREATE TABLE public.risk_assessment_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_ar TEXT,
  activity_category TEXT NOT NULL,
  industry_type TEXT,
  hazard_library JSONB DEFAULT '[]'::jsonb,
  control_library JSONB DEFAULT '[]'::jsonb,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- 2. Risk Assessments
CREATE TABLE public.risk_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  assessment_number TEXT UNIQUE NOT NULL,
  contractor_id UUID REFERENCES public.contractor_companies(id),
  project_id UUID REFERENCES public.ptw_projects(id),
  template_id UUID REFERENCES public.risk_assessment_templates(id),
  activity_name TEXT NOT NULL,
  activity_name_ar TEXT,
  activity_description TEXT,
  location TEXT,
  assessment_date TIMESTAMPTZ DEFAULT now(),
  status TEXT CHECK (status IN ('draft', 'under_review', 'approved', 'rejected', 'expired')) DEFAULT 'draft',
  ai_risk_score DECIMAL(3,2),
  ai_confidence_level DECIMAL(3,2),
  overall_risk_rating TEXT CHECK (overall_risk_rating IN ('low', 'medium', 'high', 'critical')),
  valid_until DATE,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- 3. Risk Assessment Details (Hazards & Controls)
CREATE TABLE public.risk_assessment_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  risk_assessment_id UUID NOT NULL REFERENCES public.risk_assessments(id) ON DELETE CASCADE,
  hazard_description TEXT NOT NULL,
  hazard_description_ar TEXT,
  hazard_category TEXT,
  likelihood INTEGER CHECK (likelihood BETWEEN 1 AND 5),
  severity INTEGER CHECK (severity BETWEEN 1 AND 5),
  initial_risk_score INTEGER GENERATED ALWAYS AS (likelihood * severity) STORED,
  existing_controls JSONB DEFAULT '[]'::jsonb,
  additional_controls JSONB DEFAULT '[]'::jsonb,
  responsible_person TEXT,
  target_completion_date DATE,
  residual_likelihood INTEGER CHECK (residual_likelihood BETWEEN 1 AND 5),
  residual_severity INTEGER CHECK (residual_severity BETWEEN 1 AND 5),
  residual_risk_score INTEGER GENERATED ALWAYS AS (residual_likelihood * residual_severity) STORED,
  ai_suggested BOOLEAN DEFAULT false,
  ai_confidence DECIMAL(3,2),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- 4. Risk Assessment Team & Signatures
CREATE TABLE public.risk_assessment_team (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  risk_assessment_id UUID NOT NULL REFERENCES public.risk_assessments(id) ON DELETE CASCADE,
  worker_id UUID REFERENCES public.contractor_workers(id),
  user_id UUID REFERENCES auth.users(id),
  role TEXT NOT NULL,
  role_ar TEXT,
  signature_data TEXT,
  signed_at TIMESTAMPTZ,
  is_required BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Clearance Templates
CREATE TABLE public.clearance_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_ar TEXT,
  safety_level TEXT DEFAULT 'medium' CHECK (safety_level IN ('low', 'medium', 'high', 'critical')),
  requires_risk_assessment BOOLEAN DEFAULT true,
  risk_assessment_categories JSONB DEFAULT '[]'::jsonb,
  is_default BOOLEAN DEFAULT false,
  validity_period_days INTEGER DEFAULT 30,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- 6. Clearance Template Items
CREATE TABLE public.clearance_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.clearance_templates(id) ON DELETE CASCADE,
  stage_name TEXT NOT NULL,
  stage_name_ar TEXT,
  label TEXT NOT NULL,
  label_ar TEXT,
  item_type TEXT CHECK (item_type IN ('safety_check', 'document', 'competency', 'risk_assessment', 'signature')) DEFAULT 'safety_check',
  is_mandatory BOOLEAN DEFAULT true,
  requires_document BOOLEAN DEFAULT false,
  track_expiry BOOLEAN DEFAULT false,
  competency_required JSONB DEFAULT '[]'::jsonb,
  document_types JSONB DEFAULT '[]'::jsonb,
  depends_on_items UUID[] DEFAULT '{}',
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Project Clearance Execution
CREATE TABLE public.project_clearance_execution (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.ptw_projects(id) ON DELETE CASCADE,
  clearance_template_id UUID REFERENCES public.clearance_templates(id),
  item_id UUID REFERENCES public.clearance_template_items(id),
  risk_assessment_id UUID REFERENCES public.risk_assessments(id),
  is_completed BOOLEAN DEFAULT false,
  completion_percentage DECIMAL(5,2) DEFAULT 0.00,
  note TEXT,
  document_url TEXT,
  document_type TEXT,
  expiry_date DATE,
  verified_by UUID REFERENCES auth.users(id),
  witness_id UUID REFERENCES public.contractor_workers(id),
  competency_verified BOOLEAN DEFAULT false,
  ai_validation_passed BOOLEAN DEFAULT false,
  ai_validation_notes TEXT,
  signature_data TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- 8. AI Incident Patterns (for training)
CREATE TABLE public.ai_incident_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  contractor_type TEXT,
  incident_frequency INTEGER DEFAULT 0,
  severity_pattern JSONB DEFAULT '{}'::jsonb,
  common_causes JSONB DEFAULT '[]'::jsonb,
  effective_controls JSONB DEFAULT '[]'::jsonb,
  seasonal_factors JSONB DEFAULT '{}'::jsonb,
  location_factors JSONB DEFAULT '{}'::jsonb,
  equipment_factors JSONB DEFAULT '{}'::jsonb,
  training_weight DECIMAL(3,2) DEFAULT 1.0,
  last_updated TIMESTAMPTZ DEFAULT now()
);

-- 9. AI Risk Predictions
CREATE TABLE public.ai_risk_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  risk_assessment_id UUID REFERENCES public.risk_assessments(id) ON DELETE CASCADE,
  predicted_risk_score DECIMAL(3,2),
  confidence_level DECIMAL(3,2),
  prediction_factors JSONB,
  actual_outcome TEXT,
  prediction_accuracy DECIMAL(3,2),
  learning_feedback JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add risk_assessment_id to ptw_permits
ALTER TABLE public.ptw_permits 
ADD COLUMN IF NOT EXISTS risk_assessment_id UUID REFERENCES public.risk_assessments(id);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX idx_risk_assessments_tenant ON public.risk_assessments(tenant_id);
CREATE INDEX idx_risk_assessments_project ON public.risk_assessments(project_id);
CREATE INDEX idx_risk_assessments_status ON public.risk_assessments(status);
CREATE INDEX idx_risk_assessments_contractor ON public.risk_assessments(contractor_id);
CREATE INDEX idx_risk_assessment_details_assessment ON public.risk_assessment_details(risk_assessment_id);
CREATE INDEX idx_risk_assessment_team_assessment ON public.risk_assessment_team(risk_assessment_id);
CREATE INDEX idx_clearance_execution_project ON public.project_clearance_execution(project_id);
CREATE INDEX idx_clearance_templates_tenant ON public.clearance_templates(tenant_id);

-- =============================================
-- RLS POLICIES
-- =============================================

-- Risk Assessment Templates
ALTER TABLE public.risk_assessment_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for risk_assessment_templates"
  ON public.risk_assessment_templates
  FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- Risk Assessments
ALTER TABLE public.risk_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for risk_assessments"
  ON public.risk_assessments
  FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- Risk Assessment Details
ALTER TABLE public.risk_assessment_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for risk_assessment_details"
  ON public.risk_assessment_details
  FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- Risk Assessment Team
ALTER TABLE public.risk_assessment_team ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for risk_assessment_team"
  ON public.risk_assessment_team
  FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- Clearance Templates
ALTER TABLE public.clearance_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for clearance_templates"
  ON public.clearance_templates
  FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- Clearance Template Items
ALTER TABLE public.clearance_template_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for clearance_template_items"
  ON public.clearance_template_items
  FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- Project Clearance Execution
ALTER TABLE public.project_clearance_execution ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for project_clearance_execution"
  ON public.project_clearance_execution
  FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- AI Incident Patterns
ALTER TABLE public.ai_incident_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for ai_incident_patterns"
  ON public.ai_incident_patterns
  FOR ALL
  USING (tenant_id IS NULL OR tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- AI Risk Predictions
ALTER TABLE public.ai_risk_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for ai_risk_predictions"
  ON public.ai_risk_predictions
  FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- =============================================
-- TRIGGERS
-- =============================================

-- Auto-generate assessment number
CREATE OR REPLACE FUNCTION public.generate_assessment_number()
RETURNS TRIGGER AS $$
DECLARE
  year_part TEXT;
  seq_num INTEGER;
  new_number TEXT;
BEGIN
  year_part := to_char(now(), 'YYYY');
  
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(assessment_number FROM 'RA-\d{4}-(\d+)') AS INTEGER)
  ), 0) + 1 INTO seq_num
  FROM public.risk_assessments
  WHERE assessment_number LIKE 'RA-' || year_part || '-%'
    AND tenant_id = NEW.tenant_id;
  
  new_number := 'RA-' || year_part || '-' || LPAD(seq_num::TEXT, 4, '0');
  NEW.assessment_number := new_number;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_generate_assessment_number
  BEFORE INSERT ON public.risk_assessments
  FOR EACH ROW
  WHEN (NEW.assessment_number IS NULL OR NEW.assessment_number = '')
  EXECUTE FUNCTION public.generate_assessment_number();

-- Update timestamp trigger for all new tables
CREATE TRIGGER trg_risk_assessments_updated
  BEFORE UPDATE ON public.risk_assessments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_risk_assessment_details_updated
  BEFORE UPDATE ON public.risk_assessment_details
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_risk_assessment_templates_updated
  BEFORE UPDATE ON public.risk_assessment_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_clearance_templates_updated
  BEFORE UPDATE ON public.clearance_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_project_clearance_execution_updated
  BEFORE UPDATE ON public.project_clearance_execution
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();