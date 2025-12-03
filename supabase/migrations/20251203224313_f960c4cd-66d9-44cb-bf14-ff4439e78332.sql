-- Create role categories enum
CREATE TYPE public.role_category AS ENUM (
  'general',
  'hsse',
  'environmental',
  'ptw',
  'security',
  'audit',
  'food_safety'
);

-- Create roles definition table
CREATE TABLE public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  category role_category NOT NULL,
  description text,
  is_system boolean DEFAULT false,
  module_access text[] DEFAULT '{}',
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on roles
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- Create manager_team hierarchy table
CREATE TABLE public.manager_team (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  assigned_at timestamptz DEFAULT now(),
  assigned_by uuid,
  UNIQUE(manager_id, user_id)
);

-- Enable RLS on manager_team
ALTER TABLE public.manager_team ENABLE ROW LEVEL SECURITY;

-- Create user_role_assignments table (new structure for multiple roles)
CREATE TABLE public.user_role_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  assigned_at timestamptz DEFAULT now(),
  assigned_by uuid,
  UNIQUE(user_id, role_id)
);

-- Enable RLS on user_role_assignments
ALTER TABLE public.user_role_assignments ENABLE ROW LEVEL SECURITY;

-- Seed all predefined roles
INSERT INTO public.roles (code, name, category, description, is_system, module_access, sort_order) VALUES
-- General Roles
('admin', 'Admin', 'general', 'Full system control and access', true, ARRAY['hsse_core', 'visitor_management', 'incidents', 'audits', 'reports_analytics', 'api_access', 'priority_support', 'ptw', 'security', 'food_safety'], 1),
('normal_user', 'Normal User', 'general', 'Default role for all users', true, ARRAY['hsse_core'], 2),
('manager', 'Manager', 'general', 'View-only team hierarchy access', false, ARRAY['hsse_core', 'reports_analytics'], 3),

-- HSSE Roles
('hsse_officer', 'HSSE Officer', 'hsse', 'Health, Safety, Security & Environment officer', false, ARRAY['hsse_core', 'incidents', 'audits'], 10),
('hsse_investigator', 'HSSE Investigator', 'hsse', 'Investigates HSSE incidents', false, ARRAY['hsse_core', 'incidents'], 11),
('hsse_expert', 'HSSE Expert', 'hsse', 'Subject matter expert in HSSE', false, ARRAY['hsse_core', 'incidents', 'audits', 'reports_analytics'], 12),
('hsse_manager', 'HSSE Manager', 'hsse', 'Manages HSSE department', false, ARRAY['hsse_core', 'incidents', 'audits', 'reports_analytics'], 13),
('hsse_coordinator', 'HSSE Coordinator', 'hsse', 'Coordinates HSSE activities', false, ARRAY['hsse_core', 'incidents'], 14),
('hsse_trainer', 'HSSE Trainer', 'hsse', 'Conducts HSSE training', false, ARRAY['hsse_core'], 15),
('risk_assessor', 'Risk Assessor', 'hsse', 'Performs risk assessments', false, ARRAY['hsse_core', 'audits'], 16),
('incident_analyst', 'Incident Analyst', 'hsse', 'Analyzes incident data', false, ARRAY['hsse_core', 'incidents', 'reports_analytics'], 17),
('emergency_response_leader', 'Emergency Response Leader', 'hsse', 'Leads emergency response teams', false, ARRAY['hsse_core', 'incidents'], 18),
('fire_safety_officer', 'Fire Safety Officer', 'hsse', 'Fire safety and prevention', false, ARRAY['hsse_core', 'incidents'], 19),
('hsse_compliance_auditor', 'HSSE Compliance Auditor', 'hsse', 'Audits HSSE compliance', false, ARRAY['hsse_core', 'audits', 'reports_analytics'], 20),

-- Environmental Roles
('environmental_expert', 'Environmental Expert', 'environmental', 'Environmental subject matter expert', false, ARRAY['hsse_core', 'audits'], 30),
('environmental_manager', 'Environmental Manager', 'environmental', 'Manages environmental compliance', false, ARRAY['hsse_core', 'audits', 'reports_analytics'], 31),
('environmental_compliance_officer', 'Environmental Compliance Officer', 'environmental', 'Ensures environmental compliance', false, ARRAY['hsse_core', 'audits'], 32),

-- PTW Roles
('ptw_issuer', 'PTW Issuer', 'ptw', 'Issues Permit to Work', false, ARRAY['hsse_core', 'ptw'], 40),
('ptw_receiver', 'PTW Receiver', 'ptw', 'Receives Permit to Work', false, ARRAY['hsse_core', 'ptw'], 41),
('ptw_approver', 'PTW Approver', 'ptw', 'Approves Permit to Work', false, ARRAY['hsse_core', 'ptw'], 42),

-- Security Roles
('security_guard', 'Security Guard', 'security', 'Front-line security personnel', false, ARRAY['hsse_core', 'visitor_management', 'security'], 50),
('security_supervisor', 'Security Supervisor', 'security', 'Supervises security operations', false, ARRAY['hsse_core', 'visitor_management', 'security'], 51),
('security_manager', 'Security Manager', 'security', 'Manages security department', false, ARRAY['hsse_core', 'visitor_management', 'security', 'reports_analytics'], 52),

-- Audit Roles
('inspector', 'Inspector', 'audit', 'Conducts inspections', false, ARRAY['hsse_core', 'audits'], 60),
('auditor', 'Auditor', 'audit', 'Performs internal audits', false, ARRAY['hsse_core', 'audits', 'reports_analytics'], 61),

-- Food Safety Roles
('food_safety_officer', 'Food Safety Officer', 'food_safety', 'Ensures food safety compliance', false, ARRAY['hsse_core', 'food_safety'], 70),
('food_safety_supervisor', 'Food Safety Supervisor', 'food_safety', 'Supervises food safety operations', false, ARRAY['hsse_core', 'food_safety'], 71),
('food_safety_manager', 'Food Safety Manager', 'food_safety', 'Manages food safety department', false, ARRAY['hsse_core', 'food_safety', 'reports_analytics'], 72);

-- Security definer function: Check if user has specific role by code
CREATE OR REPLACE FUNCTION public.has_role_by_code(p_user_id uuid, p_role_code text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN roles r ON ura.role_id = r.id
    WHERE ura.user_id = p_user_id AND r.code = p_role_code
  )
$$;

-- Security definer function: Check if user is admin (uses both old and new system)
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = p_user_id AND role = 'admin'
  ) OR EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN roles r ON ura.role_id = r.id
    WHERE ura.user_id = p_user_id AND r.code = 'admin'
  )
$$;

-- Security definer function: Get user's roles
CREATE OR REPLACE FUNCTION public.get_user_roles(p_user_id uuid)
RETURNS TABLE(role_id uuid, role_code text, role_name text, category role_category)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.id, r.code, r.name, r.category
  FROM user_role_assignments ura
  JOIN roles r ON ura.role_id = r.id
  WHERE ura.user_id = p_user_id AND r.is_active = true
  ORDER BY r.sort_order;
$$;

-- Security definer function: Get team hierarchy recursively
CREATE OR REPLACE FUNCTION public.get_team_hierarchy(p_manager_id uuid)
RETURNS TABLE(user_id uuid, depth integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH RECURSIVE team AS (
    SELECT mt.user_id, 1 as depth 
    FROM manager_team mt
    WHERE mt.manager_id = p_manager_id
    UNION ALL
    SELECT mt.user_id, t.depth + 1
    FROM manager_team mt
    INNER JOIN team t ON mt.manager_id = t.user_id
    WHERE t.depth < 10 -- Prevent infinite loops, max 10 levels
  )
  SELECT DISTINCT user_id, MIN(depth) as depth FROM team GROUP BY user_id;
$$;

-- Security definer function: Check if user is in manager's hierarchy
CREATE OR REPLACE FUNCTION public.is_in_team_hierarchy(p_manager_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM get_team_hierarchy(p_manager_id) WHERE user_id = p_user_id
  )
$$;

-- Trigger function to ensure normal_user role is always assigned
CREATE OR REPLACE FUNCTION public.ensure_normal_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_normal_user_role_id uuid;
BEGIN
  -- Get normal_user role id
  SELECT id INTO v_normal_user_role_id FROM roles WHERE code = 'normal_user';
  
  IF v_normal_user_role_id IS NOT NULL THEN
    -- Insert normal_user role if not exists
    INSERT INTO user_role_assignments (user_id, role_id, tenant_id, assigned_by)
    SELECT NEW.id, v_normal_user_role_id, NEW.tenant_id, NEW.id
    WHERE NOT EXISTS (
      SELECT 1 FROM user_role_assignments 
      WHERE user_id = NEW.id AND role_id = v_normal_user_role_id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on profiles to auto-assign normal_user role
CREATE TRIGGER ensure_normal_user_on_profile_create
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_normal_user_role();

-- Trigger to prevent removal of normal_user role
CREATE OR REPLACE FUNCTION public.prevent_normal_user_removal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM roles WHERE id = OLD.role_id AND code = 'normal_user') THEN
    RAISE EXCEPTION 'Cannot remove the Normal User role - it is mandatory for all users';
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER prevent_normal_user_role_removal
  BEFORE DELETE ON public.user_role_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_normal_user_removal();

-- RLS Policies for roles table
CREATE POLICY "Roles are viewable by authenticated users"
ON public.roles FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can manage roles"
ON public.roles FOR ALL
USING (is_admin(auth.uid()));

-- RLS Policies for user_role_assignments table
CREATE POLICY "Users can view their own role assignments"
ON public.user_role_assignments FOR SELECT
USING (auth.uid() = user_id OR is_admin(auth.uid()));

CREATE POLICY "Only admins can manage role assignments"
ON public.user_role_assignments FOR INSERT
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Only admins can update role assignments"
ON public.user_role_assignments FOR UPDATE
USING (is_admin(auth.uid()));

CREATE POLICY "Only admins can delete role assignments"
ON public.user_role_assignments FOR DELETE
USING (is_admin(auth.uid()));

-- RLS Policies for manager_team table
CREATE POLICY "Admins can manage all team assignments"
ON public.manager_team FOR ALL
USING (is_admin(auth.uid()));

CREATE POLICY "Managers can view their team hierarchy"
ON public.manager_team FOR SELECT
USING (
  manager_id = auth.uid() 
  OR is_in_team_hierarchy(auth.uid(), user_id)
  OR tenant_id = get_auth_tenant_id()
);

-- Add indexes for performance
CREATE INDEX idx_user_role_assignments_user_id ON public.user_role_assignments(user_id);
CREATE INDEX idx_user_role_assignments_role_id ON public.user_role_assignments(role_id);
CREATE INDEX idx_user_role_assignments_tenant_id ON public.user_role_assignments(tenant_id);
CREATE INDEX idx_manager_team_manager_id ON public.manager_team(manager_id);
CREATE INDEX idx_manager_team_user_id ON public.manager_team(user_id);
CREATE INDEX idx_manager_team_tenant_id ON public.manager_team(tenant_id);
CREATE INDEX idx_roles_code ON public.roles(code);
CREATE INDEX idx_roles_category ON public.roles(category);