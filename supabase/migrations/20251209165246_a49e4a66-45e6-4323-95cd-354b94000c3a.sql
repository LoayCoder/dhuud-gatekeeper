-- Insert the Department Representative role
INSERT INTO roles (code, name, category, description, module_access, sort_order, is_active, is_system)
VALUES (
  'department_representative',
  'Department Representative',
  'general',
  'Can approve observations and assign corrective actions for their department',
  ARRAY['hsse_core', 'incidents']::text[],
  4,
  true,
  true
)
ON CONFLICT (code) DO NOTHING;

-- Create function to check if user has department_representative role
CREATE OR REPLACE FUNCTION public.has_dept_rep_role(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.user_id = _user_id
      AND r.code = 'department_representative'
      AND r.is_active = true
  );
$$;

-- Create combined check function for dept rep approval (role OR manager hierarchy)
CREATE OR REPLACE FUNCTION public.can_approve_dept_rep_observation(
  _user_id UUID,
  _incident_id UUID
)
RETURNS BOOLEAN
LANGUAGE PLPGSQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _has_role BOOLEAN;
  _is_manager BOOLEAN;
  _incident_status TEXT;
  _reporter_dept_id UUID;
  _user_dept_id UUID;
BEGIN
  -- Check if user has department_representative role
  SELECT has_dept_rep_role(_user_id) INTO _has_role;
  
  -- Check if user is the assigned manager for this incident
  SELECT EXISTS (
    SELECT 1
    FROM incidents
    WHERE id = _incident_id
      AND approval_manager_id = _user_id
  ) INTO _is_manager;
  
  -- Check incident status
  SELECT status INTO _incident_status
  FROM incidents
  WHERE id = _incident_id;
  
  -- For dept rep role holders, also check same department
  IF _has_role AND NOT _is_manager THEN
    SELECT 
      (SELECT assigned_department_id FROM profiles WHERE id = i.reporter_id),
      (SELECT assigned_department_id FROM profiles WHERE id = _user_id)
    INTO _reporter_dept_id, _user_dept_id
    FROM incidents i
    WHERE i.id = _incident_id;
    
    -- Dept rep must be in same department as reporter (or have admin role)
    IF _reporter_dept_id IS NOT NULL AND _user_dept_id IS NOT NULL AND _reporter_dept_id != _user_dept_id THEN
      IF NOT is_admin(_user_id) THEN
        _has_role := FALSE;
      END IF;
    END IF;
  END IF;
  
  -- Can approve if:
  -- 1. Has the role (same department) OR is the assigned manager
  -- 2. Incident status is pending_dept_rep_approval
  RETURN (_has_role OR _is_manager) 
    AND _incident_status = 'pending_dept_rep_approval';
END;
$$;