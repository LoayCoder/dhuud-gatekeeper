-- Create a public storage bucket for contractor ID cards
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'contractor-id-cards',
  'contractor-id-cards',
  true,
  5242880, -- 5MB limit
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

-- Policy: Anyone can read (public bucket)
CREATE POLICY "Public read access for contractor ID cards"
ON storage.objects FOR SELECT
USING (bucket_id = 'contractor-id-cards');

-- Policy: Authenticated users can upload
CREATE POLICY "Authenticated users can upload contractor ID cards"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'contractor-id-cards');

-- Policy: Service role can manage all
CREATE POLICY "Service role can manage contractor ID cards"
ON storage.objects FOR ALL
USING (bucket_id = 'contractor-id-cards');