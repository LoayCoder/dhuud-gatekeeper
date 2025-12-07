
-- ============================================
-- Phase 11C: Asset Inspection/Checklist System
-- ============================================

-- Table 1: Inspection Templates (reusable checklists)
CREATE TABLE public.inspection_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT,
  description TEXT,
  category_id UUID REFERENCES public.asset_categories(id),
  type_id UUID REFERENCES public.asset_types(id),
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(tenant_id, code)
);

-- Table 2: Inspection Template Items (checklist questions)
CREATE TABLE public.inspection_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.inspection_templates(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  sort_order INTEGER NOT NULL DEFAULT 0,
  question TEXT NOT NULL,
  question_ar TEXT,
  response_type TEXT NOT NULL CHECK (response_type IN ('pass_fail', 'yes_no', 'rating', 'numeric', 'text')),
  min_value NUMERIC,
  max_value NUMERIC,
  rating_scale INTEGER DEFAULT 5,
  is_critical BOOLEAN DEFAULT false,
  is_required BOOLEAN DEFAULT true,
  instructions TEXT,
  instructions_ar TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Table 3: Asset Inspections (completed inspections)
CREATE TABLE public.asset_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  asset_id UUID NOT NULL REFERENCES public.hsse_assets(id),
  template_id UUID NOT NULL REFERENCES public.inspection_templates(id),
  reference_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'cancelled')),
  inspection_date DATE NOT NULL DEFAULT CURRENT_DATE,
  inspector_id UUID NOT NULL REFERENCES public.profiles(id),
  overall_result TEXT CHECK (overall_result IN ('pass', 'fail', 'partial')),
  summary_notes TEXT,
  linked_incident_id UUID REFERENCES public.incidents(id),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Table 4: Inspection Responses (individual answers)
CREATE TABLE public.inspection_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES public.asset_inspections(id) ON DELETE CASCADE,
  template_item_id UUID NOT NULL REFERENCES public.inspection_template_items(id),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  response_value TEXT,
  result TEXT CHECK (result IN ('pass', 'fail', 'na')),
  notes TEXT,
  photo_path TEXT,
  responded_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.inspection_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for inspection_templates
CREATE POLICY "Users can view templates in their tenant"
  ON public.inspection_templates FOR SELECT
  USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL);

CREATE POLICY "HSSE users can create templates"
  ON public.inspection_templates FOR INSERT
  WITH CHECK (tenant_id = get_auth_tenant_id() AND has_asset_management_access(auth.uid()));

CREATE POLICY "HSSE users can update templates"
  ON public.inspection_templates FOR UPDATE
  USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL AND has_asset_management_access(auth.uid()));

CREATE POLICY "Admins can delete templates"
  ON public.inspection_templates FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_auth_tenant_id());

-- RLS Policies for inspection_template_items
CREATE POLICY "Users can view template items in their tenant"
  ON public.inspection_template_items FOR SELECT
  USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL);

CREATE POLICY "HSSE users can create template items"
  ON public.inspection_template_items FOR INSERT
  WITH CHECK (tenant_id = get_auth_tenant_id() AND has_asset_management_access(auth.uid()));

CREATE POLICY "HSSE users can update template items"
  ON public.inspection_template_items FOR UPDATE
  USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL AND has_asset_management_access(auth.uid()));

CREATE POLICY "Admins can delete template items"
  ON public.inspection_template_items FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_auth_tenant_id());

-- RLS Policies for asset_inspections
CREATE POLICY "Users can view inspections in their tenant"
  ON public.asset_inspections FOR SELECT
  USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL);

CREATE POLICY "HSSE users can create inspections"
  ON public.asset_inspections FOR INSERT
  WITH CHECK (tenant_id = get_auth_tenant_id() AND has_asset_management_access(auth.uid()));

CREATE POLICY "HSSE users can update inspections"
  ON public.asset_inspections FOR UPDATE
  USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL AND has_asset_management_access(auth.uid()));

CREATE POLICY "Admins can delete inspections"
  ON public.asset_inspections FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_auth_tenant_id());

-- RLS Policies for inspection_responses
CREATE POLICY "Users can view responses in their tenant"
  ON public.inspection_responses FOR SELECT
  USING (tenant_id = get_auth_tenant_id());

CREATE POLICY "HSSE users can create responses"
  ON public.inspection_responses FOR INSERT
  WITH CHECK (tenant_id = get_auth_tenant_id() AND has_asset_management_access(auth.uid()));

CREATE POLICY "HSSE users can update responses"
  ON public.inspection_responses FOR UPDATE
  USING (tenant_id = get_auth_tenant_id() AND has_asset_management_access(auth.uid()));

-- Indexes for performance
CREATE INDEX idx_inspection_templates_tenant ON public.inspection_templates(tenant_id);
CREATE INDEX idx_inspection_templates_category ON public.inspection_templates(category_id);
CREATE INDEX idx_inspection_templates_type ON public.inspection_templates(type_id);
CREATE INDEX idx_inspection_templates_active ON public.inspection_templates(tenant_id, is_active) WHERE deleted_at IS NULL;

CREATE INDEX idx_template_items_template ON public.inspection_template_items(template_id);
CREATE INDEX idx_template_items_tenant ON public.inspection_template_items(tenant_id);
CREATE INDEX idx_template_items_sort ON public.inspection_template_items(template_id, sort_order);

CREATE INDEX idx_asset_inspections_tenant ON public.asset_inspections(tenant_id);
CREATE INDEX idx_asset_inspections_asset ON public.asset_inspections(asset_id);
CREATE INDEX idx_asset_inspections_template ON public.asset_inspections(template_id);
CREATE INDEX idx_asset_inspections_inspector ON public.asset_inspections(inspector_id);
CREATE INDEX idx_asset_inspections_status ON public.asset_inspections(tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_asset_inspections_date ON public.asset_inspections(asset_id, inspection_date);

CREATE INDEX idx_inspection_responses_inspection ON public.inspection_responses(inspection_id);
CREATE INDEX idx_inspection_responses_tenant ON public.inspection_responses(tenant_id);

-- Function to generate inspection reference ID
CREATE OR REPLACE FUNCTION public.generate_inspection_reference_id()
RETURNS TRIGGER AS $$
DECLARE
  year_suffix TEXT;
  sequence_num INTEGER;
BEGIN
  year_suffix := TO_CHAR(NOW(), 'YYYY');
  
  SELECT COALESCE(MAX(
    CAST(NULLIF(SPLIT_PART(reference_id, '-', 3), '') AS INTEGER)
  ), 0) + 1
  INTO sequence_num
  FROM public.asset_inspections
  WHERE tenant_id = NEW.tenant_id
    AND reference_id LIKE 'INSP-' || year_suffix || '-%';
  
  NEW.reference_id := 'INSP-' || year_suffix || '-' || LPAD(sequence_num::text, 4, '0');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER generate_inspection_reference
  BEFORE INSERT ON public.asset_inspections
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_inspection_reference_id();

-- Function to update asset inspection dates on completion
CREATE OR REPLACE FUNCTION public.update_asset_inspection_dates()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE public.hsse_assets
    SET 
      last_inspection_date = NEW.inspection_date,
      next_inspection_due = NEW.inspection_date + (COALESCE(inspection_interval_days, 30) || ' days')::INTERVAL,
      updated_at = now()
    WHERE id = NEW.asset_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_asset_on_inspection_complete
  AFTER UPDATE ON public.asset_inspections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_asset_inspection_dates();

-- Update timestamp trigger
CREATE TRIGGER update_inspection_templates_updated_at
  BEFORE UPDATE ON public.inspection_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_asset_inspections_updated_at
  BEFORE UPDATE ON public.asset_inspections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
