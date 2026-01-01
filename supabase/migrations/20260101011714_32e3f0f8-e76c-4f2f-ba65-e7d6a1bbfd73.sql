-- Create storage bucket for worker QR code images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'worker-qr-codes',
  'worker-qr-codes',
  true,  -- Must be public so WaSender can fetch the image URL
  1048576, -- 1MB limit (QR images are ~6KB)
  ARRAY['image/png', 'image/gif', 'image/jpeg']
);

-- Allow public read access (required for WaSender to fetch image)
CREATE POLICY "Public can view worker QR codes"
ON storage.objects FOR SELECT
USING (bucket_id = 'worker-qr-codes');

-- Allow service role to upload QR codes (edge function uses service key)
CREATE POLICY "Service role can upload QR codes"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'worker-qr-codes');

-- Allow service role to update QR codes
CREATE POLICY "Service role can update QR codes"
ON storage.objects FOR UPDATE
USING (bucket_id = 'worker-qr-codes');

-- Allow service role to delete QR codes
CREATE POLICY "Service role can delete QR codes"
ON storage.objects FOR DELETE
USING (bucket_id = 'worker-qr-codes');