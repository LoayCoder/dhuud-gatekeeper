-- Update has_hsse_incident_access to include department_representative role
CREATE OR REPLACE FUNCTION public.has_hsse_incident_access(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT has_role(_user_id, 'admin'::app_role) 
    OR has_role_by_code(_user_id, 'hsse_officer')
    OR has_role_by_code(_user_id, 'hsse_investigator')
    OR has_role_by_code(_user_id, 'hsse_manager')
    OR has_role_by_code(_user_id, 'incident_analyst')
    OR has_role_by_code(_user_id, 'emergency_response_leader')
    OR has_role_by_code(_user_id, 'manager')
    OR has_role_by_code(_user_id, 'department_representative')
$$;