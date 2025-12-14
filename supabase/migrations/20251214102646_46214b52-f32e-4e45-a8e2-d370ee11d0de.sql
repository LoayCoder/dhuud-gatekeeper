-- Create storage bucket for patrol evidence
INSERT INTO storage.buckets (id, name, public)
VALUES ('patrol-evidence', 'patrol-evidence', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for patrol-evidence bucket
CREATE POLICY "Patrol evidence is publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'patrol-evidence');

CREATE POLICY "Users can upload patrol evidence"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'patrol-evidence'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their patrol evidence"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'patrol-evidence'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete their patrol evidence"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'patrol-evidence'
  AND auth.role() = 'authenticated'
);