-- ==============================================================================
-- FIX: Gate Pass Table Reference
-- Problem: can_approve_gate_pass() function references non-existent 'gate_passes' table
-- Solution: Update function to use correct table name 'material_gate_passes'
-- ==============================================================================

-- Drop existing function with incorrect table reference
DROP FUNCTION IF EXISTS public.can_approve_gate_pass(uuid, uuid, text);

-- Recreate function with correct table name
CREATE OR REPLACE FUNCTION public.can_approve_gate_pass(
  p_user_id uuid,
  p_gate_pass_id uuid,
  p_stage text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gate_pass RECORD;
  v_user_tenant_id uuid;
  v_is_contractor_consultant boolean := false;
  v_is_dept_rep boolean := false;
  v_is_dept_manager boolean := false;
  v_is_club_mgmt boolean := false;
  v_is_security_supervisor boolean := false;
BEGIN
  -- Get user's tenant
  SELECT tenant_id INTO v_user_tenant_id
  FROM profiles WHERE id = p_user_id;

  -- Get gate pass details - FIXED: Changed from 'gate_passes' to 'material_gate_passes'
  SELECT gp.*, gp.tenant_id as gp_tenant_id
  INTO v_gate_pass
  FROM material_gate_passes gp
  WHERE gp.id = p_gate_pass_id AND gp.deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'Gate pass not found');
  END IF;

  -- Verify same tenant
  IF v_user_tenant_id != v_gate_pass.gp_tenant_id THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'Access denied: different tenant');
  END IF;

  -- Check user roles
  SELECT EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.user_id = p_user_id
      AND r.code = 'contractor_consultant'
      AND r.is_active = true
      AND ura.tenant_id = v_user_tenant_id
  ) INTO v_is_contractor_consultant;

  SELECT EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.user_id = p_user_id
      AND r.code = 'department_representative'
      AND r.is_active = true
      AND ura.tenant_id = v_user_tenant_id
  ) INTO v_is_dept_rep;

  SELECT EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.user_id = p_user_id
      AND r.code = 'department_manager'
      AND r.is_active = true
      AND ura.tenant_id = v_user_tenant_id
  ) INTO v_is_dept_manager;

  SELECT EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.user_id = p_user_id
      AND r.code IN ('club_management', 'golf_club_management')
      AND r.is_active = true
      AND ura.tenant_id = v_user_tenant_id
  ) INTO v_is_club_mgmt;

  SELECT EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.user_id = p_user_id
      AND r.code = 'security_supervisor'
      AND r.is_active = true
      AND ura.tenant_id = v_user_tenant_id
  ) INTO v_is_security_supervisor;

  -- Check authorization based on SIMPLIFIED stage names
  CASE p_stage
    WHEN 'contractor' THEN
      IF v_is_contractor_consultant THEN
        RETURN jsonb_build_object('allowed', true);
      END IF;
      RETURN jsonb_build_object('allowed', false, 'reason', 'Contractor consultant role required');

    WHEN 'dept_approval' THEN
      -- CRITICAL: Department representative must be in the SAME department as the requester
      IF (v_is_dept_rep OR v_is_dept_manager) AND EXISTS (
        SELECT 1 FROM profiles req, profiles approver
        WHERE approver.id = p_user_id
          AND req.id = v_gate_pass.requested_by
          AND req.assigned_department_id = approver.assigned_department_id
          AND approver.tenant_id = v_user_tenant_id
          AND req.tenant_id = v_user_tenant_id
      ) THEN
        RETURN jsonb_build_object('allowed', true);
      END IF;
      RETURN jsonb_build_object('allowed', false, 'reason', 'Department representative or manager role in the same department as requester required');

    WHEN 'dept_ack' THEN
      -- External contractor workflow: Golf Club Management acknowledgment
      -- Allow users with club management role
      IF v_is_club_mgmt THEN
        RETURN jsonb_build_object('allowed', true);
      END IF;

      -- CRITICAL: Department rep must be from Golf Club Management department ONLY
      IF (v_is_dept_rep OR v_is_dept_manager) AND EXISTS (
        SELECT 1 FROM profiles p
        JOIN departments d ON d.id = p.assigned_department_id
        WHERE p.id = p_user_id
          AND (d.name = 'Golf Club Management'
               OR d.name ILIKE '%golf%club%management%'
               OR d.name ILIKE '%club%management%')
          AND d.tenant_id = v_user_tenant_id
          AND p.tenant_id = v_user_tenant_id
          AND d.deleted_at IS NULL
      ) THEN
        RETURN jsonb_build_object('allowed', true);
      END IF;

      RETURN jsonb_build_object('allowed', false, 'reason', 'Club management role or Golf Club Management department representative required');

    WHEN 'security' THEN
      IF v_is_security_supervisor THEN
        RETURN jsonb_build_object('allowed', true);
      END IF;
      RETURN jsonb_build_object('allowed', false, 'reason', 'Security supervisor role required');

    ELSE
      RETURN jsonb_build_object('allowed', false, 'reason', 'Unknown approval stage: ' || p_stage);
  END CASE;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.can_approve_gate_pass(uuid, uuid, text) TO authenticated;

-- Add comment documenting the fix
COMMENT ON FUNCTION public.can_approve_gate_pass(uuid, uuid, text) IS
'Validates if a user can approve a gate pass at a specific stage.
FIXED:
1. Updated to reference material_gate_passes instead of non-existent gate_passes table
2. Added department matching check for dept_approval stage to prevent cross-department approvals
3. Ensures department representatives can only approve requests from their own department
4. Restricted dept_ack stage (contractor workflow) to club management role OR Golf Club Management dept reps only
5. Prevents other department representatives from approving contractor gate passes
6. Fixed stage name mismatch: dept_ack is the actual stage name used by approve_gate_pass_unified()';
