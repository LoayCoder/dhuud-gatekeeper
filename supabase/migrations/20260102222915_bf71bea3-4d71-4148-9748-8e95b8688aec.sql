-- Add photo_path column to visitors table
ALTER TABLE public.visitors ADD COLUMN IF NOT EXISTS photo_path TEXT;

-- Create storage bucket for blacklist photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('blacklist-photos', 'blacklist-photos', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for blacklist-photos bucket
CREATE POLICY "Users can view blacklist photos from their tenant"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'blacklist-photos' 
  AND (storage.foldername(name))[1] = (
    SELECT tenant_id::text FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can upload blacklist photos to their tenant folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'blacklist-photos' 
  AND (storage.foldername(name))[1] = (
    SELECT tenant_id::text FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can update blacklist photos in their tenant folder"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'blacklist-photos' 
  AND (storage.foldername(name))[1] = (
    SELECT tenant_id::text FROM profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can delete blacklist photos from their tenant folder"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'blacklist-photos' 
  AND (storage.foldername(name))[1] = (
    SELECT tenant_id::text FROM profiles WHERE id = auth.uid()
  )
);