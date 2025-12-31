-- Create helper function to check if user shares department with an incident
CREATE OR REPLACE FUNCTION public.is_in_same_department(_user_id uuid, _incident_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM profiles p
    JOIN incidents i ON i.id = _incident_id
    LEFT JOIN profiles reporter ON reporter.id = i.reporter_id
    WHERE p.id = _user_id
      AND p.deleted_at IS NULL
      AND p.assigned_department_id IS NOT NULL
      AND (
        i.department_id = p.assigned_department_id
        OR reporter.assigned_department_id = p.assigned_department_id
      )
  );
$$;

-- Update can_view_incident to include department_representative role
CREATE OR REPLACE FUNCTION public.can_view_incident(_user_id uuid, _incident_reporter_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = 'public'
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
        -- OR same department check
        OR EXISTS (
          SELECT 1 FROM profiles p1, profiles p2
          WHERE p1.id = _user_id 
            AND p2.id = _incident_reporter_id
            AND p1.assigned_department_id IS NOT NULL
            AND p1.assigned_department_id = p2.assigned_department_id
        )
      )
    )
    
    -- 5. Department Representative can see incidents in their department
    OR (
      has_role_by_code(_user_id, 'department_representative')
      AND EXISTS (
        SELECT 1 
        FROM profiles dept_rep
        JOIN incidents i ON i.reporter_id = _incident_reporter_id
        LEFT JOIN profiles reporter ON reporter.id = i.reporter_id
        WHERE dept_rep.id = _user_id
          AND dept_rep.deleted_at IS NULL
          AND dept_rep.assigned_department_id IS NOT NULL
          AND i.deleted_at IS NULL
          AND (
            -- Incident department matches rep's department
            i.department_id = dept_rep.assigned_department_id
            -- OR reporter's department matches rep's department
            OR reporter.assigned_department_id = dept_rep.assigned_department_id
          )
      )
    );
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.is_in_same_department(uuid, uuid) TO authenticated;