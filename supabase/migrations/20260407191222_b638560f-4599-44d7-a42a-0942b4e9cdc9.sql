
-- Add new columns to contractor_workers
ALTER TABLE public.contractor_workers
  ADD COLUMN IF NOT EXISTS id_type text NOT NULL DEFAULT 'national_id',
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS emergency_contact_name text,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone text,
  ADD COLUMN IF NOT EXISTS worker_role text NOT NULL DEFAULT 'laborer',
  ADD COLUMN IF NOT EXISTS expiry_date date,
  ADD COLUMN IF NOT EXISTS fitness_to_work text,
  ADD COLUMN IF NOT EXISTS training_certifications text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ptw_access_status text,
  ADD COLUMN IF NOT EXISTS ptw_access_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS ptw_access_approved_by uuid,
  ADD COLUMN IF NOT EXISTS ptw_access_approved_at timestamptz;

-- Create ptw_access_requests table
CREATE TABLE IF NOT EXISTS public.ptw_access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  worker_id uuid NOT NULL REFERENCES public.contractor_workers(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.contractor_companies(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ptw_access_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies using get_auth_tenant_id()
CREATE POLICY "Tenant isolation select" ON public.ptw_access_requests
  FOR SELECT USING (tenant_id = get_auth_tenant_id());

CREATE POLICY "Tenant isolation insert" ON public.ptw_access_requests
  FOR INSERT WITH CHECK (tenant_id = get_auth_tenant_id());

CREATE POLICY "Tenant isolation update" ON public.ptw_access_requests
  FOR UPDATE USING (tenant_id = get_auth_tenant_id());

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_ptw_access_requests_worker ON public.ptw_access_requests(worker_id);
CREATE INDEX IF NOT EXISTS idx_ptw_access_requests_status ON public.ptw_access_requests(status);
CREATE INDEX IF NOT EXISTS idx_ptw_access_requests_tenant ON public.ptw_access_requests(tenant_id);
