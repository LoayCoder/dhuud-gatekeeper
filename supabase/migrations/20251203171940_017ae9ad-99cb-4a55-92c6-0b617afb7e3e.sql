-- Create tenant_modules table for per-tenant module control (overrides plan defaults)
CREATE TABLE public.tenant_modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  enabled_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  enabled_by UUID,
  disabled_at TIMESTAMP WITH TIME ZONE,
  disabled_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, module_id)
);

-- Enable RLS
ALTER TABLE public.tenant_modules ENABLE ROW LEVEL SECURITY;

-- Admin-only policies for tenant_modules
CREATE POLICY "Admins can view all tenant modules"
ON public.tenant_modules FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

CREATE POLICY "Admins can manage tenant modules"
ON public.tenant_modules FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_tenant_modules_updated_at
BEFORE UPDATE ON public.tenant_modules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to get tenant modules (replaces existing, now considers overrides)
CREATE OR REPLACE FUNCTION public.get_tenant_modules_with_overrides(p_tenant_id UUID)
RETURNS TABLE (
  module_id UUID,
  module_code TEXT,
  module_name TEXT,
  is_enabled BOOLEAN,
  source TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id AS module_id,
    m.code AS module_code,
    m.name AS module_name,
    COALESCE(tm.enabled, pm.included_in_base, false) AS is_enabled,
    CASE 
      WHEN tm.id IS NOT NULL THEN 'override'
      WHEN pm.id IS NOT NULL THEN 'plan'
      ELSE 'none'
    END AS source
  FROM public.modules m
  LEFT JOIN public.tenants t ON t.id = p_tenant_id
  LEFT JOIN public.plan_modules pm ON pm.plan_id = t.plan_id AND pm.module_id = m.id
  LEFT JOIN public.tenant_modules tm ON tm.tenant_id = p_tenant_id AND tm.module_id = m.id
  WHERE m.is_active = true
  ORDER BY m.sort_order, m.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;