-- Create enum for self-registration status
CREATE TYPE public.visitor_self_registration_status AS ENUM ('pending', 'approved', 'rejected', 'expired');

-- Create visitor_self_registrations table
CREATE TABLE public.visitor_self_registrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  registration_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  company_name TEXT NOT NULL,
  national_id TEXT NOT NULL,
  nationality TEXT,
  photo_path TEXT,
  id_document_path TEXT,
  id_verified BOOLEAN DEFAULT FALSE,
  purpose TEXT,
  expected_visit_date DATE NOT NULL,
  expected_visit_time TIME,
  host_name TEXT,
  host_email TEXT,
  host_department TEXT,
  site_id UUID REFERENCES public.sites(id),
  status public.visitor_self_registration_status DEFAULT 'pending',
  converted_visitor_id UUID REFERENCES public.visitors(id),
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES public.profiles(id),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '7 days'),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes
CREATE INDEX idx_visitor_self_registrations_tenant ON public.visitor_self_registrations(tenant_id);
CREATE INDEX idx_visitor_self_registrations_status ON public.visitor_self_registrations(status);
CREATE INDEX idx_visitor_self_registrations_token ON public.visitor_self_registrations(registration_token);
CREATE INDEX idx_visitor_self_registrations_national_id ON public.visitor_self_registrations(national_id);

-- Enable RLS
ALTER TABLE public.visitor_self_registrations ENABLE ROW LEVEL SECURITY;

-- RLS policies
-- Anon users can insert (public registration)
CREATE POLICY "Allow public self-registration insert"
ON public.visitor_self_registrations
FOR INSERT
TO anon
WITH CHECK (true);

-- Anon users can read their own registration by token
CREATE POLICY "Allow public read by token"
ON public.visitor_self_registrations
FOR SELECT
TO anon
USING (true);

-- Authenticated users can read their tenant's registrations
CREATE POLICY "Tenant users can read registrations"
ON public.visitor_self_registrations
FOR SELECT
TO authenticated
USING (tenant_id IN (
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
));

-- Authenticated users can update their tenant's registrations
CREATE POLICY "Tenant users can update registrations"
ON public.visitor_self_registrations
FOR UPDATE
TO authenticated
USING (tenant_id IN (
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
));

-- Create storage bucket for self-registration photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'visitor-self-registration',
  'visitor-self-registration',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Storage policies for visitor-self-registration bucket
CREATE POLICY "Allow public upload to visitor-self-registration"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (bucket_id = 'visitor-self-registration');

CREATE POLICY "Allow public read from visitor-self-registration"
ON storage.objects
FOR SELECT
TO anon
USING (bucket_id = 'visitor-self-registration');

CREATE POLICY "Allow authenticated read from visitor-self-registration"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'visitor-self-registration');

CREATE POLICY "Allow authenticated delete from visitor-self-registration"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'visitor-self-registration');