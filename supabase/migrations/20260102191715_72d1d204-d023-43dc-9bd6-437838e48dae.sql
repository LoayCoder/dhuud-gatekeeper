-- Create storage bucket for emergency photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('visitor-emergency', 'visitor-emergency', false)
ON CONFLICT (id) DO NOTHING;

-- Create policies for visitor-emergency bucket

-- Policy for uploading emergency photos (public - no auth required for visitors)
CREATE POLICY "Anyone can upload emergency photos"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'visitor-emergency');

-- Policy for authenticated users to view emergency photos
CREATE POLICY "Authenticated users can view emergency photos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'visitor-emergency' AND auth.role() = 'authenticated');

-- Policy for authenticated users to delete emergency photos
CREATE POLICY "Authenticated users can delete emergency photos"
ON storage.objects
FOR DELETE
USING (bucket_id = 'visitor-emergency' AND auth.role() = 'authenticated');