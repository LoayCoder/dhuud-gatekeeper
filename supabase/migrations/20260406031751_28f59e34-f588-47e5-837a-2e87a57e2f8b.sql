CREATE POLICY "Tenant users can update ID cards"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'id-cards'
  AND (storage.foldername(name))[1] = (
    SELECT profiles.tenant_id::text FROM profiles WHERE profiles.id = auth.uid() LIMIT 1
  )
)
WITH CHECK (
  bucket_id = 'id-cards'
  AND (storage.foldername(name))[1] = (
    SELECT profiles.tenant_id::text FROM profiles WHERE profiles.id = auth.uid() LIMIT 1
  )
);