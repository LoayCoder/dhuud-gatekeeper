-- =====================================================
-- SECURITY FIX: Storage Tenant Isolation & New Buckets
-- =====================================================

-- 1. Drop existing overly permissive branding policies
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Branding assets are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload branding assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update branding assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete branding assets" ON storage.objects;

-- 2. Create secure tenant-isolated policies for branding bucket
-- Public read access (assets are meant to be displayed publicly)
CREATE POLICY "Branding assets are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'branding');

-- Admin-only upload with tenant isolation (path must start with their tenant_id)
CREATE POLICY "Admins can upload branding to their tenant folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'branding' 
  AND has_role(auth.uid(), 'admin'::app_role)
  AND (storage.foldername(name))[1] = get_auth_tenant_id()::text
);

-- Admin-only update with tenant isolation
CREATE POLICY "Admins can update branding in their tenant folder"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'branding' 
  AND has_role(auth.uid(), 'admin'::app_role)
  AND (storage.foldername(name))[1] = get_auth_tenant_id()::text
);

-- Admin-only delete with tenant isolation
CREATE POLICY "Admins can delete branding from their tenant folder"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'branding' 
  AND has_role(auth.uid(), 'admin'::app_role)
  AND (storage.foldername(name))[1] = get_auth_tenant_id()::text
);

-- 3. Create incident-attachments bucket for heavy data module
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'incident-attachments', 
  'incident-attachments', 
  false,
  52428800,  -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf', 'video/mp4', 'video/quicktime']
)
ON CONFLICT (id) DO NOTHING;

-- 4. Create audit-evidence bucket for audit module
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'audit-evidence', 
  'audit-evidence', 
  false,
  52428800,  -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- 5. RLS policies for incident-attachments bucket
-- Users can view attachments within their tenant
CREATE POLICY "Users can view incident attachments in their tenant"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'incident-attachments'
  AND (storage.foldername(name))[1] = get_auth_tenant_id()::text
);

-- Users can upload attachments to their tenant folder
CREATE POLICY "Users can upload incident attachments to their tenant"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'incident-attachments'
  AND (storage.foldername(name))[1] = get_auth_tenant_id()::text
);

-- Users can update attachments in their tenant
CREATE POLICY "Users can update incident attachments in their tenant"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'incident-attachments'
  AND (storage.foldername(name))[1] = get_auth_tenant_id()::text
);

-- Admins can delete attachments in their tenant
CREATE POLICY "Admins can delete incident attachments in their tenant"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'incident-attachments'
  AND has_role(auth.uid(), 'admin'::app_role)
  AND (storage.foldername(name))[1] = get_auth_tenant_id()::text
);

-- 6. RLS policies for audit-evidence bucket
-- Users can view evidence within their tenant
CREATE POLICY "Users can view audit evidence in their tenant"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'audit-evidence'
  AND (storage.foldername(name))[1] = get_auth_tenant_id()::text
);

-- Users can upload evidence to their tenant folder
CREATE POLICY "Users can upload audit evidence to their tenant"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'audit-evidence'
  AND (storage.foldername(name))[1] = get_auth_tenant_id()::text
);

-- Users can update evidence in their tenant
CREATE POLICY "Users can update audit evidence in their tenant"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'audit-evidence'
  AND (storage.foldername(name))[1] = get_auth_tenant_id()::text
);

-- Admins can delete evidence in their tenant
CREATE POLICY "Admins can delete audit evidence in their tenant"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'audit-evidence'
  AND has_role(auth.uid(), 'admin'::app_role)
  AND (storage.foldername(name))[1] = get_auth_tenant_id()::text
);