-- ==============================================================================
-- Fix: Allow authenticated users to upload public gate pass photos
--
-- The storage bucket only had an INSERT policy for anon users.
-- If a logged-in staff member visits the public request page, the Supabase
-- client uses the authenticated role and uploads are rejected.
-- ==============================================================================

-- Allow authenticated users to also upload photos to the public bucket
CREATE POLICY "Authenticated can upload public gate pass photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'public-gate-pass-photos');
