-- Add new branding columns to tenants table
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS secondary_color text,
ADD COLUMN IF NOT EXISTS background_theme text DEFAULT 'color',
ADD COLUMN IF NOT EXISTS background_color text,
ADD COLUMN IF NOT EXISTS app_icon_url text,
ADD COLUMN IF NOT EXISTS background_image_url text;

-- Create branding storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('branding', 'branding', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for the branding bucket
CREATE POLICY "Authenticated users can upload branding assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'branding');

CREATE POLICY "Anyone can view branding assets"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'branding');

CREATE POLICY "Authenticated users can update branding assets"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'branding');

CREATE POLICY "Authenticated users can delete branding assets"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'branding');