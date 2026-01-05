-- Guard Training Records
CREATE TABLE public.guard_training_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  guard_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  training_type TEXT NOT NULL,
  training_name TEXT NOT NULL,
  training_provider TEXT,
  completion_date DATE NOT NULL,
  expiry_date DATE,
  certificate_url TEXT,
  certificate_number TEXT,
  score NUMERIC,
  passed BOOLEAN DEFAULT true,
  notes TEXT,
  verified_by UUID REFERENCES public.profiles(id),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Training Requirements per Role
CREATE TABLE public.guard_training_requirements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  role_code TEXT NOT NULL,
  training_type TEXT NOT NULL,
  is_mandatory BOOLEAN DEFAULT true,
  renewal_period_months INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(tenant_id, role_code, training_type)
);

-- Guard Site Assignments for Multi-Site Pool
CREATE TABLE public.guard_site_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  guard_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,
  can_float BOOLEAN DEFAULT true,
  assignment_type TEXT NOT NULL DEFAULT 'permanent' CHECK (assignment_type IN ('permanent', 'temporary', 'floating')),
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_guard_training_records_guard ON public.guard_training_records(guard_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_guard_training_records_expiry ON public.guard_training_records(expiry_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_guard_site_assignments_guard ON public.guard_site_assignments(guard_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_guard_site_assignments_site ON public.guard_site_assignments(site_id) WHERE deleted_at IS NULL;

-- Enable RLS
ALTER TABLE public.guard_training_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guard_training_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guard_site_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for guard_training_records
CREATE POLICY "Tenant isolation for guard_training_records"
  ON public.guard_training_records
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- RLS Policies for guard_training_requirements
CREATE POLICY "Tenant isolation for guard_training_requirements"
  ON public.guard_training_requirements
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- RLS Policies for guard_site_assignments
CREATE POLICY "Tenant isolation for guard_site_assignments"
  ON public.guard_site_assignments
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Triggers for updated_at
CREATE TRIGGER update_guard_training_records_updated_at
  BEFORE UPDATE ON public.guard_training_records
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_guard_training_requirements_updated_at
  BEFORE UPDATE ON public.guard_training_requirements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_guard_site_assignments_updated_at
  BEFORE UPDATE ON public.guard_site_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();