-- Create gate_pass_approvers table for configurable approval sources
CREATE TABLE public.gate_pass_approvers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_ar TEXT,
  code TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(tenant_id, code)
);

-- Add approval_from_id to material_gate_passes
ALTER TABLE public.material_gate_passes 
ADD COLUMN approval_from_id UUID REFERENCES public.gate_pass_approvers(id);

-- Enable RLS
ALTER TABLE public.gate_pass_approvers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view approvers in their tenant"
ON public.gate_pass_approvers FOR SELECT
TO authenticated
USING (tenant_id = public.get_auth_tenant_id() AND deleted_at IS NULL);

CREATE POLICY "Admins can manage approvers"
ON public.gate_pass_approvers FOR ALL
TO authenticated
USING (tenant_id = public.get_auth_tenant_id() AND public.is_admin(auth.uid()))
WITH CHECK (tenant_id = public.get_auth_tenant_id() AND public.is_admin(auth.uid()));

-- Index for performance
CREATE INDEX idx_gate_pass_approvers_tenant ON public.gate_pass_approvers(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_gate_pass_approvers_active ON public.gate_pass_approvers(tenant_id, is_active) WHERE deleted_at IS NULL;

-- Trigger for updated_at
CREATE TRIGGER update_gate_pass_approvers_updated_at
  BEFORE UPDATE ON public.gate_pass_approvers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();