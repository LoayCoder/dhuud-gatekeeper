-- Gate Pass Creation Access Control Fix
-- Implements role-based validation for gate pass creation

-- Create helper function for contractor admin access check if not exists
CREATE OR REPLACE FUNCTION has_contractor_admin_access(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.user_id = p_user_id
      AND r.code IN ('contractor_admin', 'contractor_manager')
      AND r.is_active = true
  );
END;
$$;

-- Create the can_create_gate_pass validation function
CREATE OR REPLACE FUNCTION can_create_gate_pass(
  p_user_id UUID,
  p_is_internal_request BOOLEAN,
  p_company_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_type TEXT;
  v_is_contractor_rep BOOLEAN;
  v_is_admin BOOLEAN;
  v_has_contractor_admin BOOLEAN;
  v_rep_company_id UUID;
BEGIN
  -- Get user type
  SELECT user_type INTO v_user_type FROM profiles WHERE id = p_user_id;
  
  -- Check if admin
  SELECT is_admin(p_user_id) INTO v_is_admin;
  IF v_is_admin THEN
    RETURN jsonb_build_object('allowed', true, 'can_internal', true, 'can_external', true);
  END IF;
  
  -- Check if contractor admin
  SELECT has_contractor_admin_access(p_user_id) INTO v_has_contractor_admin;
  IF v_has_contractor_admin THEN
    RETURN jsonb_build_object('allowed', true, 'can_internal', true, 'can_external', true);
  END IF;
  
  -- Check if contractor rep
  SELECT cr.company_id INTO v_rep_company_id
  FROM contractor_representatives cr
  WHERE cr.user_id = p_user_id 
    AND cr.deleted_at IS NULL
  LIMIT 1;
  
  v_is_contractor_rep := v_rep_company_id IS NOT NULL;
  
  -- INTERNAL REQUEST: Only employees can create
  IF p_is_internal_request THEN
    IF v_user_type = 'employee' THEN
      RETURN jsonb_build_object('allowed', true, 'can_internal', true, 'can_external', v_is_contractor_rep);
    ELSE
      RETURN jsonb_build_object('allowed', false, 'reason', 'Only employees can create internal gate passes', 'can_internal', false, 'can_external', v_is_contractor_rep);
    END IF;
  END IF;
  
  -- EXTERNAL REQUEST: Only contractor reps for their company
  IF v_is_contractor_rep THEN
    -- If company_id provided, verify it matches the rep's company
    IF p_company_id IS NOT NULL AND p_company_id != v_rep_company_id THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'You can only create passes for your own company', 'can_internal', v_user_type = 'employee', 'can_external', true, 'company_id', v_rep_company_id);
    END IF;
    RETURN jsonb_build_object('allowed', true, 'can_internal', v_user_type = 'employee', 'can_external', true, 'company_id', v_rep_company_id);
  ELSE
    RETURN jsonb_build_object('allowed', false, 'reason', 'Only contractor representatives can create external gate passes', 'can_internal', v_user_type = 'employee', 'can_external', false);
  END IF;
END;
$$;

-- Drop the overly permissive tenant-wide policy
DROP POLICY IF EXISTS "material_gate_passes_tenant_rls" ON material_gate_passes;

-- Create specific INSERT policy with validation
CREATE POLICY "gate_pass_insert_role_based" 
ON material_gate_passes
FOR INSERT
WITH CHECK (
  tenant_id = get_auth_tenant_id()
  AND requested_by = auth.uid()
  AND (
    -- Admins can create any pass
    is_admin(auth.uid())
    -- OR Contractor admin can create any pass
    OR has_contractor_admin_access(auth.uid())
    -- OR Internal request by employee
    OR (is_internal_request = true AND (
      SELECT user_type FROM profiles WHERE id = auth.uid()
    ) = 'employee')
    -- OR External request by contractor rep for their company
    OR (is_internal_request = false AND EXISTS (
      SELECT 1 FROM contractor_representatives cr
      WHERE cr.user_id = auth.uid()
        AND cr.company_id = material_gate_passes.company_id
        AND cr.deleted_at IS NULL
    ))
  )
);

-- Create SELECT policy for viewing gate passes
CREATE POLICY "gate_pass_select_role_based"
ON material_gate_passes
FOR SELECT
USING (
  tenant_id = get_auth_tenant_id()
  AND deleted_at IS NULL
  AND (
    -- Requester can always see their own passes
    requested_by = auth.uid()
    -- Approvers can see passes they need to approve
    OR approval_from_id = auth.uid()
    -- PM/Safety approvers can see
    OR pm_approved_by = auth.uid()
    OR safety_approved_by = auth.uid()
    -- Contractor consultant/admin
    OR contractor_approved_by = auth.uid()
    -- Admins can see all
    OR is_admin(auth.uid())
    -- Contractor admins can see all
    OR has_contractor_admin_access(auth.uid())
    -- Security roles can see for entry/exit
    OR EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN roles r ON r.id = ura.role_id
      WHERE ura.user_id = auth.uid()
        AND r.code IN ('security_guard', 'security_shift_leader', 'security_supervisor', 'security_manager')
        AND r.is_active = true
    )
    -- Department representatives can see passes in their approval queue
    OR EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN roles r ON r.id = ura.role_id
      WHERE ura.user_id = auth.uid()
        AND r.code = 'department_representative'
        AND r.is_active = true
    )
    -- Contractor consultants can see external passes
    OR (is_internal_request = false AND EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN roles r ON r.id = ura.role_id
      WHERE ura.user_id = auth.uid()
        AND r.code = 'contractor_consultant'
        AND r.is_active = true
    ))
  )
);

-- Create UPDATE policy for status changes
CREATE POLICY "gate_pass_update_role_based"
ON material_gate_passes
FOR UPDATE
USING (
  tenant_id = get_auth_tenant_id()
  AND deleted_at IS NULL
  AND (
    -- Requester can update their own pending passes
    requested_by = auth.uid()
    -- Admins can update
    OR is_admin(auth.uid())
    -- Contractor admin can update
    OR has_contractor_admin_access(auth.uid())
    -- Approvers can update for approval actions
    OR approval_from_id = auth.uid()
    -- Security can update for entry/exit
    OR EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN roles r ON r.id = ura.role_id
      WHERE ura.user_id = auth.uid()
        AND r.code IN ('security_guard', 'security_shift_leader', 'security_supervisor', 'security_manager')
        AND r.is_active = true
    )
    -- Department reps can update for approvals
    OR EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN roles r ON r.id = ura.role_id
      WHERE ura.user_id = auth.uid()
        AND r.code = 'department_representative'
        AND r.is_active = true
    )
    -- Contractor consultants can update external passes
    OR (is_internal_request = false AND EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN roles r ON r.id = ura.role_id
      WHERE ura.user_id = auth.uid()
        AND r.code = 'contractor_consultant'
        AND r.is_active = true
    ))
  )
);