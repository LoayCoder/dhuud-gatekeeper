-- Create tenant status enum
CREATE TYPE public.tenant_status AS ENUM ('active', 'suspended', 'disabled');

-- Add new columns to tenants table
ALTER TABLE public.tenants
ADD COLUMN status public.tenant_status NOT NULL DEFAULT 'active',
ADD COLUMN industry TEXT,
ADD COLUMN country TEXT,
ADD COLUMN city TEXT,
ADD COLUMN contact_email TEXT,
ADD COLUMN contact_phone TEXT,
ADD COLUMN contact_person TEXT,
ADD COLUMN notes TEXT,
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create trigger function for updated_at (if not exists)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for tenants updated_at
CREATE TRIGGER update_tenants_updated_at
BEFORE UPDATE ON public.tenants
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update RLS: Only Dhuud admins can INSERT tenants
CREATE POLICY "Admins can insert tenants"
ON public.tenants
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Update RLS: Only Dhuud admins can DELETE tenants
CREATE POLICY "Admins can delete tenants"
ON public.tenants
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));