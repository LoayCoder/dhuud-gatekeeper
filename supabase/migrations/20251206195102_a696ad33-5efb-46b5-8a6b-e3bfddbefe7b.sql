-- Create asset-files storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('asset-files', 'asset-files', false, 52428800) -- 50MB limit
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for asset-files bucket
-- Policy: Users can view files from their tenant
CREATE POLICY "Tenant users can view asset files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'asset-files' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM profiles WHERE id = auth.uid())
);

-- Policy: HSSE/Admin users can upload files to their tenant folder
CREATE POLICY "HSSE users can upload asset files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'asset-files'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM profiles WHERE id = auth.uid())
  AND has_asset_management_access(auth.uid())
);

-- Policy: HSSE/Admin users can update files in their tenant folder
CREATE POLICY "HSSE users can update asset files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'asset-files'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM profiles WHERE id = auth.uid())
  AND has_asset_management_access(auth.uid())
);

-- Policy: HSSE/Admin users can delete files in their tenant folder
CREATE POLICY "HSSE users can delete asset files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'asset-files'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM profiles WHERE id = auth.uid())
  AND has_asset_management_access(auth.uid())
);