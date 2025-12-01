-- Create tenants table
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  brand_color TEXT NOT NULL DEFAULT '221.2 83.2% 53.3%',
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on tenants
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read tenants (needed for branding on login)
CREATE POLICY "Tenants are viewable by everyone"
  ON public.tenants
  FOR SELECT
  USING (true);

-- Policy: Only authenticated users can update tenants (we'll add admin checks later)
CREATE POLICY "Authenticated users can update tenants"
  ON public.tenants
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Create invitations table
CREATE TABLE public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on invitations
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read invitations to validate codes
CREATE POLICY "Invitations are viewable by everyone"
  ON public.invitations
  FOR SELECT
  USING (true);

-- Policy: Authenticated users can update invitations
CREATE POLICY "Authenticated users can update invitations"
  ON public.invitations
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Insert seed data for tenants
INSERT INTO public.tenants (name, slug, brand_color, logo_url) VALUES
  ('Dhuud Platform', 'dhuud', '221.2 83.2% 53.3%', NULL),
  ('Golf Saudi', 'golf-saudi', '142 76% 36%', NULL);

-- Insert seed data for invitation (expires in 1 year)
INSERT INTO public.invitations (code, email, tenant_id, expires_at) VALUES
  ('GOLF-2025', 'demo@golfsaudi.com', 
   (SELECT id FROM public.tenants WHERE slug = 'golf-saudi'),
   NOW() + INTERVAL '1 year');