-- Update can_view_incident function to include department-based access for managers
CREATE OR REPLACE FUNCTION public.can_view_incident(_user_id uuid, _incident_reporter_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    -- 1. User reported it themselves
    _user_id = _incident_reporter_id  
    
    -- 2. User is admin
    OR has_role(_user_id, 'admin'::app_role)  
    
    -- 3. User has HSSE access (sees ALL events)
    OR has_hsse_incident_access(_user_id)
    
    -- 4. Manager can see:
    --    a) Team hierarchy members' events
    --    b) Same department members' events
    OR (
      has_role_by_code(_user_id, 'manager') 
      AND (
        -- Team hierarchy check (existing)
        is_in_team_hierarchy(_user_id, _incident_reporter_id)
        -- OR same department check (NEW)
        OR EXISTS (
          SELECT 1 FROM profiles p1, profiles p2
          WHERE p1.id = _user_id 
            AND p2.id = _incident_reporter_id
            AND p1.assigned_department_id IS NOT NULL
            AND p1.assigned_department_id = p2.assigned_department_id
        )
      )
    )
$$;