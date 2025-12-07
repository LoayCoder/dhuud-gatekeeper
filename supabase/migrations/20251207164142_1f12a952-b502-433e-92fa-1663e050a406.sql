-- Create storage bucket for inspection files
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('inspection-files', 'inspection-files', false, 10485760) -- 10MB limit
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies for inspection-files bucket
CREATE POLICY "Users can view inspection files in their tenant"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'inspection-files' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = get_auth_tenant_id()::text
);

CREATE POLICY "HSSE users can upload inspection files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'inspection-files'
  AND auth.uid() IS NOT NULL
  AND has_asset_management_access(auth.uid())
  AND (storage.foldername(name))[1] = get_auth_tenant_id()::text
);

CREATE POLICY "HSSE users can update inspection files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'inspection-files'
  AND auth.uid() IS NOT NULL
  AND has_asset_management_access(auth.uid())
  AND (storage.foldername(name))[1] = get_auth_tenant_id()::text
);

CREATE POLICY "HSSE users can delete inspection files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'inspection-files'
  AND auth.uid() IS NOT NULL
  AND has_asset_management_access(auth.uid())
  AND (storage.foldername(name))[1] = get_auth_tenant_id()::text
);

-- Create area_inspection_photos table for metadata tracking
CREATE TABLE public.area_inspection_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  response_id UUID NOT NULL REFERENCES area_inspection_responses(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  caption TEXT,
  gps_lat DOUBLE PRECISION,
  gps_lng DOUBLE PRECISION,
  gps_accuracy DOUBLE PRECISION,
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.area_inspection_photos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for area_inspection_photos
CREATE POLICY "Users can view photos in their tenant"
ON public.area_inspection_photos FOR SELECT
USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL);

CREATE POLICY "HSSE users can create photos"
ON public.area_inspection_photos FOR INSERT
WITH CHECK (tenant_id = get_auth_tenant_id() AND has_asset_management_access(auth.uid()));

CREATE POLICY "HSSE users can update photos"
ON public.area_inspection_photos FOR UPDATE
USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL AND has_asset_management_access(auth.uid()));

CREATE POLICY "Admins can delete photos"
ON public.area_inspection_photos FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) AND tenant_id = get_auth_tenant_id());

-- Create indexes for performance
CREATE INDEX idx_area_inspection_photos_response ON public.area_inspection_photos(response_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_area_inspection_photos_tenant ON public.area_inspection_photos(tenant_id) WHERE deleted_at IS NULL;