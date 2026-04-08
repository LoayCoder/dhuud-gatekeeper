CREATE POLICY "Authenticated can upload public gate pass photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'public-gate-pass-photos');