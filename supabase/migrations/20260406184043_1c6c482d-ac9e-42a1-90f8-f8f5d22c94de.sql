-- Create ptw_permit_workers junction table
CREATE TABLE public.ptw_permit_workers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  permit_id uuid NOT NULL REFERENCES public.ptw_permits(id) ON DELETE CASCADE,
  worker_id uuid NOT NULL REFERENCES public.contractor_workers(id),
  is_permit_holder boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE(permit_id, worker_id)
);

-- Enable RLS
ALTER TABLE public.ptw_permit_workers ENABLE ROW LEVEL SECURITY;

-- RLS policies for tenant isolation
CREATE POLICY "Tenant users can view permit workers"
  ON public.ptw_permit_workers
  FOR SELECT
  TO authenticated
  USING (tenant_id = get_auth_tenant_id());

CREATE POLICY "Tenant users can insert permit workers"
  ON public.ptw_permit_workers
  FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = get_auth_tenant_id());

CREATE POLICY "Tenant users can update permit workers"
  ON public.ptw_permit_workers
  FOR UPDATE
  TO authenticated
  USING (tenant_id = get_auth_tenant_id());

-- Index for fast lookups
CREATE INDEX idx_ptw_permit_workers_permit_id ON public.ptw_permit_workers(permit_id);
CREATE INDEX idx_ptw_permit_workers_worker_id ON public.ptw_permit_workers(worker_id);
CREATE INDEX idx_ptw_permit_workers_tenant_id ON public.ptw_permit_workers(tenant_id);