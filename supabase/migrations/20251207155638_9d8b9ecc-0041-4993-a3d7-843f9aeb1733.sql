
-- =============================================
-- Phase 1: Site/Area Inspections Schema
-- =============================================

-- Step 1: Extend inspection_templates table with template_type and area-specific fields
ALTER TABLE public.inspection_templates 
ADD COLUMN IF NOT EXISTS template_type TEXT NOT NULL DEFAULT 'asset',
ADD COLUMN IF NOT EXISTS scope_description TEXT,
ADD COLUMN IF NOT EXISTS estimated_duration_minutes INTEGER,
ADD COLUMN IF NOT EXISTS requires_photos BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS requires_gps BOOLEAN DEFAULT false;

-- Add constraint for valid template types
ALTER TABLE public.inspection_templates 
ADD CONSTRAINT valid_template_type CHECK (template_type IN ('asset', 'area', 'audit'));

-- Step 2: Extend inspection_sessions with area scope fields
ALTER TABLE public.inspection_sessions
ADD COLUMN IF NOT EXISTS scope_notes TEXT,
ADD COLUMN IF NOT EXISTS weather_conditions TEXT,
ADD COLUMN IF NOT EXISTS attendees JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS gps_boundary JSONB;

-- Step 3: Create area_inspection_responses table for checklist-based inspections
CREATE TABLE public.area_inspection_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  session_id UUID NOT NULL REFERENCES public.inspection_sessions(id) ON DELETE CASCADE,
  template_item_id UUID NOT NULL REFERENCES public.inspection_template_items(id),
  
  -- Response data
  response_value TEXT,
  result TEXT CHECK (result IN ('pass', 'fail', 'na', 'pending')),
  notes TEXT,
  
  -- Photo evidence (array of storage paths)
  photo_paths JSONB DEFAULT '[]'::jsonb,
  
  -- GPS capture
  gps_lat DOUBLE PRECISION,
  gps_lng DOUBLE PRECISION,
  gps_accuracy DOUBLE PRECISION,
  
  -- Metadata
  responded_by UUID REFERENCES public.profiles(id),
  responded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Unique constraint: one response per item per session
  UNIQUE(session_id, template_item_id)
);

-- Enable RLS
ALTER TABLE public.area_inspection_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for area_inspection_responses
CREATE POLICY "Users can view responses in their tenant"
ON public.area_inspection_responses
FOR SELECT
USING (tenant_id = get_auth_tenant_id());

CREATE POLICY "HSSE users can create responses"
ON public.area_inspection_responses
FOR INSERT
WITH CHECK (tenant_id = get_auth_tenant_id() AND has_asset_management_access(auth.uid()));

CREATE POLICY "HSSE users can update responses"
ON public.area_inspection_responses
FOR UPDATE
USING (tenant_id = get_auth_tenant_id() AND has_asset_management_access(auth.uid()));

CREATE POLICY "Admins can delete responses"
ON public.area_inspection_responses
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_auth_tenant_id());

-- Step 4: Create performance indexes
CREATE INDEX IF NOT EXISTS idx_inspection_templates_type ON public.inspection_templates(template_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_inspection_templates_tenant_type ON public.inspection_templates(tenant_id, template_type) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_area_responses_session ON public.area_inspection_responses(session_id);
CREATE INDEX IF NOT EXISTS idx_area_responses_tenant ON public.area_inspection_responses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_area_responses_item ON public.area_inspection_responses(template_item_id);

CREATE INDEX IF NOT EXISTS idx_sessions_type ON public.inspection_sessions(session_type) WHERE deleted_at IS NULL;

-- Step 5: Create trigger for updated_at
CREATE TRIGGER update_area_responses_updated_at
  BEFORE UPDATE ON public.area_inspection_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
