-- Phase 2: Add GPS columns to hsse_assets table for geo-location tracking
ALTER TABLE public.hsse_assets 
ADD COLUMN IF NOT EXISTS gps_lat DECIMAL(10,7) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS gps_lng DECIMAL(10,7) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS gps_accuracy DOUBLE PRECISION DEFAULT NULL,
ADD COLUMN IF NOT EXISTS gps_validated_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS location_verified BOOLEAN DEFAULT FALSE;

-- Phase 7: Create saved_report_templates table for custom report builder
CREATE TABLE IF NOT EXISTS public.saved_report_templates (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id),
    name TEXT NOT NULL,
    description TEXT,
    entity_type TEXT NOT NULL DEFAULT 'assets', -- assets, incidents, inspections etc
    columns JSONB NOT NULL DEFAULT '[]',
    filters JSONB DEFAULT '{}',
    grouping JSONB DEFAULT '{}',
    sorting JSONB DEFAULT '[]',
    is_shared BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- Enable RLS
ALTER TABLE public.saved_report_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for saved_report_templates
CREATE POLICY "Users can view their own or shared templates"
ON public.saved_report_templates
FOR SELECT
USING (
    auth.uid() = created_by 
    OR is_shared = true
);

CREATE POLICY "Users can create their own templates"
ON public.saved_report_templates
FOR INSERT
WITH CHECK (
    auth.uid() = created_by
    AND tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Users can update their own templates"
ON public.saved_report_templates
FOR UPDATE
USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own templates"
ON public.saved_report_templates
FOR DELETE
USING (auth.uid() = created_by);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_saved_report_templates_tenant_entity 
ON public.saved_report_templates(tenant_id, entity_type) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_saved_report_templates_created_by 
ON public.saved_report_templates(created_by) 
WHERE deleted_at IS NULL;

-- Add trigger for updated_at
CREATE TRIGGER update_saved_report_templates_updated_at
BEFORE UPDATE ON public.saved_report_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index on hsse_assets GPS columns for map queries
CREATE INDEX IF NOT EXISTS idx_hsse_assets_gps 
ON public.hsse_assets(gps_lat, gps_lng) 
WHERE gps_lat IS NOT NULL AND gps_lng IS NOT NULL AND deleted_at IS NULL;