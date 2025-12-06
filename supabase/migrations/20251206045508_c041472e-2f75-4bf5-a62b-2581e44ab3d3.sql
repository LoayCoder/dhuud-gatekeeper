-- Create function to check if user can view incident
CREATE OR REPLACE FUNCTION can_view_incident(_user_id uuid, _incident_reporter_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  -- User can view if:
  -- 1. They reported it themselves
  -- 2. They are admin
  -- 3. They have HSSE access (includes HSSE Expert, Officer, Investigator, Manager)
  -- 4. They are a manager AND the reporter is in their team hierarchy
  SELECT 
    _user_id = _incident_reporter_id  -- Own incident
    OR has_role(_user_id, 'admin'::app_role)  -- Admin
    OR has_hsse_incident_access(_user_id)  -- HSSE roles
    OR (
      has_role_by_code(_user_id, 'manager') 
      AND is_in_team_hierarchy(_user_id, _incident_reporter_id)
    )  -- Manager with team member
$$;

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view tenant incidents" ON incidents;

-- Create new role-based access policy
CREATE POLICY "Users can view own or authorized incidents"
ON incidents FOR SELECT
USING (
  tenant_id = get_auth_tenant_id()
  AND deleted_at IS NULL
  AND can_view_incident(auth.uid(), reporter_id)
);