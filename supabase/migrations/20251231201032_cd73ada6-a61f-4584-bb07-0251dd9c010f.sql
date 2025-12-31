-- Create contractor_safety_officers table for multiple safety officers per company
CREATE TABLE public.contractor_safety_officers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.contractor_companies(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- Enable Row Level Security
ALTER TABLE public.contractor_safety_officers ENABLE ROW LEVEL SECURITY;

-- RLS policies for tenant isolation
CREATE POLICY "Users can view safety officers in their tenant"
  ON public.contractor_safety_officers FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert safety officers in their tenant"
  ON public.contractor_safety_officers FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update safety officers in their tenant"
  ON public.contractor_safety_officers FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete safety officers in their tenant"
  ON public.contractor_safety_officers FOR DELETE
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- Create index for faster lookups
CREATE INDEX idx_contractor_safety_officers_company ON public.contractor_safety_officers(company_id) WHERE deleted_at IS NULL;

-- Migrate existing single safety officer data to the new table
INSERT INTO public.contractor_safety_officers (company_id, tenant_id, name, phone, email, is_primary)
SELECT id, tenant_id, contractor_safety_officer_name, contractor_safety_officer_phone, contractor_safety_officer_email, true
FROM public.contractor_companies
WHERE contractor_safety_officer_name IS NOT NULL 
  AND contractor_safety_officer_name != ''
  AND deleted_at IS NULL;

-- Add trigger for updated_at
CREATE TRIGGER update_contractor_safety_officers_updated_at
  BEFORE UPDATE ON public.contractor_safety_officers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();