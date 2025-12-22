-- ============================================
-- Incident Notification Matrix System - COMPLETE
-- GCC-Standard Role-Based Routing
-- ============================================

-- 1. Create incident_notification_matrix table
CREATE TABLE IF NOT EXISTS public.incident_notification_matrix (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  stakeholder_role TEXT NOT NULL CHECK (stakeholder_role IN (
    'area_owner', 'hsse_manager', 'dept_representative', 'hsse_expert', 
    'bc_team', 'first_aider', 'clinic_team', 'security'
  )),
  severity_level TEXT NOT NULL CHECK (severity_level IN (
    'level_1', 'level_2', 'level_3', 'level_4', 'level_5'
  )),
  channels TEXT[] NOT NULL DEFAULT '{}' CHECK (channels <@ ARRAY['push', 'email', 'whatsapp']::TEXT[]),
  condition_type TEXT CHECK (condition_type IN ('injury', 'erp')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(tenant_id, stakeholder_role, severity_level)
);

CREATE INDEX IF NOT EXISTS idx_notification_matrix_lookup 
ON public.incident_notification_matrix(tenant_id, severity_level, is_active) 
WHERE deleted_at IS NULL;

ALTER TABLE public.incident_notification_matrix ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can view notification matrix"
ON public.incident_notification_matrix FOR SELECT
USING (tenant_id = get_auth_tenant_id() OR tenant_id IS NULL);

CREATE POLICY "Admins can manage notification matrix"
ON public.incident_notification_matrix FOR ALL
USING (tenant_id = get_auth_tenant_id() AND has_role(auth.uid(), 'admin'::app_role));

-- 2. Create site_stakeholders table
CREATE TABLE IF NOT EXISTS public.site_stakeholders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stakeholder_type TEXT NOT NULL CHECK (stakeholder_type IN ('area_owner', 'site_manager', 'safety_coordinator')),
  is_primary BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(site_id, stakeholder_type, user_id)
);

CREATE INDEX IF NOT EXISTS idx_site_stakeholders_site ON public.site_stakeholders(site_id, stakeholder_type) WHERE deleted_at IS NULL AND is_active = true;
CREATE INDEX IF NOT EXISTS idx_site_stakeholders_user ON public.site_stakeholders(user_id) WHERE deleted_at IS NULL;

ALTER TABLE public.site_stakeholders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can view site stakeholders"
ON public.site_stakeholders FOR SELECT
USING (tenant_id = get_auth_tenant_id());

CREATE POLICY "Admins can manage site stakeholders"
ON public.site_stakeholders FOR ALL
USING (tenant_id = get_auth_tenant_id() AND has_role(auth.uid(), 'admin'::app_role));

-- 3. Create duty_roster table
CREATE TABLE IF NOT EXISTS public.duty_roster (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  duty_type TEXT NOT NULL CHECK (duty_type IN ('first_aider', 'clinic_team', 'security')),
  duty_date DATE NOT NULL,
  shift_start TIME NOT NULL,
  shift_end TIME NOT NULL,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_duty_roster_lookup 
ON public.duty_roster(tenant_id, duty_date, duty_type, is_active) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_duty_roster_site 
ON public.duty_roster(site_id, duty_date, duty_type) 
WHERE deleted_at IS NULL AND is_active = true;

ALTER TABLE public.duty_roster ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can view duty roster"
ON public.duty_roster FOR SELECT
USING (tenant_id = get_auth_tenant_id());

CREATE POLICY "Admins and HSSE managers can manage duty roster"
ON public.duty_roster FOR ALL
USING (
  tenant_id = get_auth_tenant_id() 
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN roles r ON r.id = ura.role_id
      WHERE ura.user_id = auth.uid() AND r.code IN ('hsse_manager', 'security_manager')
    )
  )
);

-- 4. Add new roles with proper category
INSERT INTO public.roles (code, name, category, description, is_active, is_system)
VALUES 
  ('bc_team', 'Business Continuity Team', 'hsse', 'Business Continuity Team member for emergency response', true, true),
  ('first_aider', 'First Aider', 'hsse', 'Certified first aid responder', true, true),
  ('clinic_team', 'Clinic Team', 'hsse', 'Medical clinic staff member', true, true)
ON CONFLICT (code) DO NOTHING;

-- 5. Seed notification matrix
INSERT INTO public.incident_notification_matrix (tenant_id, stakeholder_role, severity_level, channels, condition_type, is_active)
VALUES
  (NULL, 'area_owner', 'level_1', ARRAY['push'], NULL, true),
  (NULL, 'area_owner', 'level_2', ARRAY['email'], NULL, true),
  (NULL, 'area_owner', 'level_3', ARRAY['email', 'whatsapp'], NULL, true),
  (NULL, 'area_owner', 'level_4', ARRAY['whatsapp', 'push'], NULL, true),
  (NULL, 'area_owner', 'level_5', ARRAY['whatsapp', 'push'], NULL, true),
  (NULL, 'hsse_manager', 'level_1', ARRAY[]::TEXT[], NULL, true),
  (NULL, 'hsse_manager', 'level_2', ARRAY['push'], NULL, true),
  (NULL, 'hsse_manager', 'level_3', ARRAY['email', 'whatsapp'], NULL, true),
  (NULL, 'hsse_manager', 'level_4', ARRAY['whatsapp', 'push'], NULL, true),
  (NULL, 'hsse_manager', 'level_5', ARRAY['whatsapp', 'push'], NULL, true),
  (NULL, 'dept_representative', 'level_1', ARRAY['email'], NULL, true),
  (NULL, 'dept_representative', 'level_2', ARRAY['email'], NULL, true),
  (NULL, 'dept_representative', 'level_3', ARRAY['email', 'whatsapp'], NULL, true),
  (NULL, 'dept_representative', 'level_4', ARRAY['whatsapp', 'push'], NULL, true),
  (NULL, 'dept_representative', 'level_5', ARRAY['whatsapp', 'push'], NULL, true),
  (NULL, 'hsse_expert', 'level_1', ARRAY[]::TEXT[], NULL, true),
  (NULL, 'hsse_expert', 'level_2', ARRAY[]::TEXT[], NULL, true),
  (NULL, 'hsse_expert', 'level_3', ARRAY['push'], NULL, true),
  (NULL, 'hsse_expert', 'level_4', ARRAY['email', 'whatsapp'], NULL, true),
  (NULL, 'hsse_expert', 'level_5', ARRAY['whatsapp', 'push'], NULL, true),
  (NULL, 'bc_team', 'level_1', ARRAY[]::TEXT[], NULL, true),
  (NULL, 'bc_team', 'level_2', ARRAY[]::TEXT[], NULL, true),
  (NULL, 'bc_team', 'level_3', ARRAY[]::TEXT[], NULL, true),
  (NULL, 'bc_team', 'level_4', ARRAY['email'], NULL, true),
  (NULL, 'bc_team', 'level_5', ARRAY['email', 'whatsapp'], NULL, true),
  (NULL, 'first_aider', 'level_1', ARRAY['whatsapp'], 'injury', true),
  (NULL, 'first_aider', 'level_2', ARRAY['whatsapp'], 'injury', true),
  (NULL, 'first_aider', 'level_3', ARRAY['whatsapp'], NULL, true),
  (NULL, 'first_aider', 'level_4', ARRAY['whatsapp'], NULL, true),
  (NULL, 'first_aider', 'level_5', ARRAY['whatsapp'], NULL, true),
  (NULL, 'clinic_team', 'level_1', ARRAY[]::TEXT[], NULL, true),
  (NULL, 'clinic_team', 'level_2', ARRAY[]::TEXT[], NULL, true),
  (NULL, 'clinic_team', 'level_3', ARRAY['whatsapp'], NULL, true),
  (NULL, 'clinic_team', 'level_4', ARRAY['whatsapp'], NULL, true),
  (NULL, 'clinic_team', 'level_5', ARRAY['whatsapp'], NULL, true),
  (NULL, 'security', 'level_1', ARRAY['push'], NULL, true),
  (NULL, 'security', 'level_2', ARRAY['push'], NULL, true),
  (NULL, 'security', 'level_3', ARRAY['whatsapp', 'push'], NULL, true),
  (NULL, 'security', 'level_4', ARRAY['whatsapp', 'push'], NULL, true),
  (NULL, 'security', 'level_5', ARRAY['whatsapp', 'push'], NULL, true)
ON CONFLICT (tenant_id, stakeholder_role, severity_level) DO NOTHING;

-- 6. Add audit columns to auto_notification_logs
ALTER TABLE public.auto_notification_logs 
ADD COLUMN IF NOT EXISTS severity_level TEXT,
ADD COLUMN IF NOT EXISTS stakeholder_role TEXT,
ADD COLUMN IF NOT EXISTS matrix_rule_id UUID,
ADD COLUMN IF NOT EXISTS was_erp_override BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS attempt_count INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS retry_at TIMESTAMPTZ;

-- 7. Create get_on_duty_personnel function
CREATE OR REPLACE FUNCTION public.get_on_duty_personnel(
  p_tenant_id UUID,
  p_site_id UUID,
  p_duty_type TEXT,
  p_at_time TIMESTAMPTZ DEFAULT now()
)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  phone_number TEXT,
  email TEXT,
  duty_type TEXT
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dr.user_id,
    p.full_name,
    p.phone_number,
    p.email,
    dr.duty_type
  FROM duty_roster dr
  JOIN profiles p ON p.id = dr.user_id
  WHERE dr.tenant_id = p_tenant_id
    AND dr.deleted_at IS NULL
    AND dr.is_active = true
    AND dr.duty_date = (p_at_time AT TIME ZONE 'UTC')::DATE
    AND (p_at_time AT TIME ZONE 'UTC')::TIME BETWEEN dr.shift_start AND dr.shift_end
    AND (dr.site_id = p_site_id OR dr.site_id IS NULL)
    AND (p_duty_type IS NULL OR dr.duty_type = p_duty_type)
  ORDER BY 
    CASE WHEN dr.site_id = p_site_id THEN 0 ELSE 1 END,
    dr.created_at;
END;
$$;

-- 8. Create triggers
CREATE TRIGGER update_incident_notification_matrix_updated_at
BEFORE UPDATE ON public.incident_notification_matrix
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_site_stakeholders_updated_at
BEFORE UPDATE ON public.site_stakeholders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_duty_roster_updated_at
BEFORE UPDATE ON public.duty_roster
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();