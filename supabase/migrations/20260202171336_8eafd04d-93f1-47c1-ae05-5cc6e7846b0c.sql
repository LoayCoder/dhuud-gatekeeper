-- ==============================================================================
-- FIX: Add Missing Approval Stage Cases to can_approve_gate_pass Function
-- Problem: Department reps cannot approve gate passes in certain statuses because
--          the function is missing cases for club_mgmt_ack, pm, and safety stages
-- Solution: Add all missing stage cases to the function
-- ==============================================================================

-- Drop existing function
DROP FUNCTION IF EXISTS public.can_approve_gate_pass(uuid, uuid, text);

-- Recreate function with club_mgmt_ack case added
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

  -- Get gate pass details
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

  -- Check user roles (optimized with CTE to avoid multiple queries)
  WITH user_roles AS (
    SELECT r.code
    FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.user_id = p_user_id
      AND r.is_active = true
      AND ura.tenant_id = v_user_tenant_id
  )
  SELECT
    EXISTS(SELECT 1 FROM user_roles WHERE code = 'contractor_consultant'),
    EXISTS(SELECT 1 FROM user_roles WHERE code = 'department_representative'),
    EXISTS(SELECT 1 FROM user_roles WHERE code = 'department_manager'),
    EXISTS(SELECT 1 FROM user_roles WHERE code IN ('club_management', 'golf_club_management')),
    EXISTS(SELECT 1 FROM user_roles WHERE code = 'security_supervisor')
  INTO
    v_is_contractor_consultant,
    v_is_dept_rep,
    v_is_dept_manager,
    v_is_club_mgmt,
    v_is_security_supervisor;

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

    WHEN 'dept_ack', 'club_mgmt_ack' THEN
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

    WHEN 'security', 'safety' THEN
      -- Allow security supervisors for both current and legacy safety stages
      IF v_is_security_supervisor THEN
        RETURN jsonb_build_object('allowed', true);
      END IF;
      RETURN jsonb_build_object('allowed', false, 'reason', 'Security supervisor role required');

    WHEN 'pm' THEN
      -- Legacy PM approval stage - must be in the same department as requester
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
FIXED (2026-02-17):
- Added missing club_mgmt_ack case to allow Golf Club Management department reps to approve external gate passes
- Added missing pm case to handle legacy PM approval workflow with department matching security check
- Added missing safety case to handle legacy safety approval workflow
- Combined security and safety cases to reduce code duplication
- Combined dept_ack and club_mgmt_ack cases to reduce code duplication
- Enhanced pm stage security: Department representatives can only approve requests from their own department
- This fixes the error "Unknown approval stage: club_mgmt_ack/pm/safety" that was preventing approvals

PREVIOUS FIXES:
1. Updated to reference material_gate_passes instead of non-existent gate_passes table
2. Added department matching check for dept_approval stage to prevent cross-department approvals
3. Ensures department representatives can only approve requests from their own department
4. Restricted dept_ack stage (contractor workflow) to club management role OR Golf Club Management dept reps only
5. Prevents other department representatives from approving contractor gate passes
6. Fixed stage name mismatch: dept_ack is the actual stage name used by approve_gate_pass_unified()
7. Replaced 5 separate role check queries with single CTE for improved performance';