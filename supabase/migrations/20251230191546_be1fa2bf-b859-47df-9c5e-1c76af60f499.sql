-- Create violation_types table for progressive discipline management
CREATE TABLE public.violation_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  name TEXT NOT NULL,
  name_ar TEXT,
  severity_level TEXT NOT NULL CHECK (severity_level IN ('level_1', 'level_2', 'level_3', 'level_4', 'level_5')),
  first_action_type TEXT NOT NULL CHECK (first_action_type IN ('fine', 'warning', 'suspension', 'site_removal', 'termination')),
  first_fine_amount DECIMAL(10,2),
  first_action_description TEXT,
  second_action_type TEXT NOT NULL CHECK (second_action_type IN ('fine', 'warning', 'suspension', 'site_removal', 'termination')),
  second_fine_amount DECIMAL(10,2),
  second_action_description TEXT,
  third_action_type TEXT NOT NULL CHECK (third_action_type IN ('fine', 'warning', 'suspension', 'site_removal', 'termination')),
  third_fine_amount DECIMAL(10,2),
  third_action_description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.violation_types ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tenant isolation
CREATE POLICY "Users can view violation types in their tenant"
  ON public.violation_types
  FOR SELECT
  USING (
    deleted_at IS NULL AND
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert violation types in their tenant"
  ON public.violation_types
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update violation types in their tenant"
  ON public.violation_types
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete violation types in their tenant"
  ON public.violation_types
  FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_violation_types_updated_at
  BEFORE UPDATE ON public.violation_types
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for tenant_id
CREATE INDEX idx_violation_types_tenant_id ON public.violation_types(tenant_id);
CREATE INDEX idx_violation_types_severity ON public.violation_types(severity_level);