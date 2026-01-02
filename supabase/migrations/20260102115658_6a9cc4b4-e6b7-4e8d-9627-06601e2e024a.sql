-- Create worker_zone_authorizations junction table for zone-level access control
CREATE TABLE public.worker_zone_authorizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES public.contractor_workers(id) ON DELETE CASCADE,
  zone_id UUID NOT NULL REFERENCES public.security_zones(id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  granted_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT unique_worker_zone UNIQUE (worker_id, zone_id)
);

-- Enable RLS
ALTER TABLE public.worker_zone_authorizations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "tenant_isolation" ON public.worker_zone_authorizations
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Create index for faster lookups
CREATE INDEX idx_worker_zone_auth_worker ON public.worker_zone_authorizations(worker_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_worker_zone_auth_zone ON public.worker_zone_authorizations(zone_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_worker_zone_auth_tenant ON public.worker_zone_authorizations(tenant_id) WHERE deleted_at IS NULL;

-- Add comment
COMMENT ON TABLE public.worker_zone_authorizations IS 'Junction table for zone-level worker access control';