-- Create table for contractor company access QR codes
CREATE TABLE public.contractor_company_access_qr (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.contractor_companies(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  person_type TEXT NOT NULL CHECK (person_type IN ('site_rep', 'safety_officer')),
  safety_officer_id UUID REFERENCES public.contractor_safety_officers(id) ON DELETE CASCADE,
  person_name TEXT NOT NULL,
  person_phone TEXT,
  person_email TEXT,
  qr_token TEXT UNIQUE NOT NULL,
  valid_from TIMESTAMPTZ DEFAULT now(),
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  is_revoked BOOLEAN DEFAULT false,
  revoked_at TIMESTAMPTZ,
  revocation_reason TEXT,
  whatsapp_sent_at TIMESTAMPTZ,
  whatsapp_message_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- Create indexes
CREATE INDEX idx_contractor_access_qr_company ON public.contractor_company_access_qr(company_id);
CREATE INDEX idx_contractor_access_qr_tenant ON public.contractor_company_access_qr(tenant_id);
CREATE INDEX idx_contractor_access_qr_token ON public.contractor_company_access_qr(qr_token);
CREATE INDEX idx_contractor_access_qr_active ON public.contractor_company_access_qr(is_active, is_revoked) WHERE deleted_at IS NULL;

-- Enable RLS
ALTER TABLE public.contractor_company_access_qr ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view QR codes for their tenant"
ON public.contractor_company_access_qr
FOR SELECT
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can create QR codes for their tenant"
ON public.contractor_company_access_qr
FOR INSERT
WITH CHECK (
  tenant_id IN (
    SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can update QR codes for their tenant"
ON public.contractor_company_access_qr
FOR UPDATE
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_contractor_access_qr_updated_at
BEFORE UPDATE ON public.contractor_company_access_qr
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();