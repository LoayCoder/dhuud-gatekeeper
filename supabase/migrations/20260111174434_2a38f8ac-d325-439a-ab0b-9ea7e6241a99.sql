-- Create gate_pass_types table for configurable pass types
CREATE TABLE public.gate_pass_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  name_ar text,
  description text,
  icon text,
  allowed_scope text DEFAULT 'both' CHECK (allowed_scope IN ('external', 'internal', 'both')),
  is_active boolean DEFAULT true NOT NULL,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  deleted_at timestamptz,
  UNIQUE (tenant_id, code)
);

-- Create indexes
CREATE INDEX idx_gate_pass_types_tenant ON public.gate_pass_types(tenant_id);
CREATE INDEX idx_gate_pass_types_active ON public.gate_pass_types(tenant_id, is_active) WHERE deleted_at IS NULL;

-- Enable Row Level Security
ALTER TABLE public.gate_pass_types ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "tenant_isolation_select" ON public.gate_pass_types
  FOR SELECT
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "tenant_isolation_insert" ON public.gate_pass_types
  FOR INSERT
  WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "tenant_isolation_update" ON public.gate_pass_types
  FOR UPDATE
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "tenant_isolation_delete" ON public.gate_pass_types
  FOR DELETE
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_gate_pass_types_updated_at
  BEFORE UPDATE ON public.gate_pass_types
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default pass types for all existing tenants
INSERT INTO public.gate_pass_types (tenant_id, code, name, name_ar, allowed_scope, sort_order, icon)
SELECT 
  t.id,
  pt.code,
  pt.name,
  pt.name_ar,
  pt.allowed_scope,
  pt.sort_order,
  pt.icon
FROM public.tenants t
CROSS JOIN (VALUES
  ('material_in', 'Material In', 'دخول مواد', 'both', 1, 'package'),
  ('material_out', 'Material Out', 'خروج مواد', 'both', 2, 'package-x'),
  ('equipment_in', 'Equipment In', 'دخول معدات', 'both', 3, 'hard-hat'),
  ('equipment_out', 'Equipment Out', 'خروج معدات', 'both', 4, 'truck')
) AS pt(code, name, name_ar, allowed_scope, sort_order, icon);