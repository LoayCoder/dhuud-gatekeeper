-- Fix: Remove ura.deleted_at references from gate pass approval functions
-- Drop and recreate get_user_pending_gate_passes due to return type change

-- Drop existing function first
DROP FUNCTION IF EXISTS public.get_user_pending_gate_passes(uuid);

-- Recreate get_user_pending_gate_passes without ura.deleted_at reference
CREATE OR REPLACE FUNCTION public.get_user_pending_gate_passes(p_user_id uuid)
RETURNS TABLE(
  id uuid,
  reference_id text,
  status text,
  is_internal_request boolean,
  project_name text,
  requester_name text,
  created_at timestamptz,
  approval_role text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_roles TEXT[];
  v_user_department_id uuid;
  v_user_branch_id uuid;
BEGIN
  -- Get user's role codes (FIXED: removed ura.deleted_at IS NULL)
  SELECT ARRAY_AGG(r.code)
  INTO v_user_roles
  FROM user_role_assignments ura
  JOIN roles r ON ura.role_id = r.id AND r.is_active = true
  WHERE ura.user_id = p_user_id;

  -- Get user's department and branch
  SELECT prof.department_id, prof.branch_id
  INTO v_user_department_id, v_user_branch_id
  FROM profiles prof
  WHERE prof.id = p_user_id;

  RETURN QUERY
  SELECT 
    mgp.id,
    mgp.reference_id,
    mgp.status,
    mgp.is_internal_request,
    COALESCE(proj.name, 'N/A') as project_name,
    COALESCE(req.full_name, 'Unknown') as requester_name,
    mgp.created_at,
    CASE 
      WHEN mgp.status = 'pending_dept_approval' THEN 'Department Representative'
      WHEN mgp.status = 'pending_contractor_approval' THEN 'Contractor Consultant'
      WHEN mgp.status = 'pending_club_mgmt_ack' THEN 'Golf Club Management'
      WHEN mgp.status = 'pending_security_approval' THEN 'Security Supervisor'
      ELSE 'Unknown'
    END as approval_role
  FROM material_gate_passes mgp
  LEFT JOIN projects proj ON mgp.project_id = proj.id
  LEFT JOIN profiles req ON mgp.requester_id = req.id
  WHERE mgp.deleted_at IS NULL
    AND (
      -- Department Representative: pending_dept_approval for their designated passes
      (mgp.status = 'pending_dept_approval' 
        AND mgp.is_internal_request = true 
        AND (mgp.approval_from_id = p_user_id OR 'department_representative' = ANY(v_user_roles)))
      
      -- Contractor Consultant: pending_contractor_approval
      OR (mgp.status = 'pending_contractor_approval' 
        AND mgp.is_internal_request = false 
        AND 'contractor_consultant' = ANY(v_user_roles))
      
      -- Golf Club Management: pending_club_mgmt_ack
      OR (mgp.status = 'pending_club_mgmt_ack' 
        AND ('department_representative' = ANY(v_user_roles) OR 'department_manager' = ANY(v_user_roles)))
      
      -- Security Supervisor: pending_security_approval
      OR (mgp.status = 'pending_security_approval' 
        AND 'security_supervisor' = ANY(v_user_roles))
    )
  ORDER BY mgp.created_at DESC;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_user_pending_gate_passes(uuid) TO authenticated;