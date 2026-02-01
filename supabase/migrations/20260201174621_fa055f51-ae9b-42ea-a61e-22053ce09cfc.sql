-- Gate Pass Unified Approval Workflow Migration
-- Status flow:
-- External (Contractor): pending_contractor_approval → pending_dept_ack → approved → used → completed
-- Internal (Employee): pending_dept_approval → pending_security_approval → approved → used → completed
-- Terminal: rejected, expired, cancelled

-- Add comment documenting the status state machine
COMMENT ON COLUMN material_gate_passes.status IS 
'Status flow:
External (Contractor): pending_contractor_approval → pending_dept_ack → approved → used → completed
Internal (Employee): pending_dept_approval → pending_security_approval → approved → used → completed
Terminal: rejected, expired, cancelled';

-- Add missing columns for new workflow if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'material_gate_passes' AND column_name = 'contractor_approved_by') THEN
    ALTER TABLE material_gate_passes ADD COLUMN contractor_approved_by UUID REFERENCES profiles(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'material_gate_passes' AND column_name = 'contractor_approved_at') THEN
    ALTER TABLE material_gate_passes ADD COLUMN contractor_approved_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'material_gate_passes' AND column_name = 'contractor_approval_notes') THEN
    ALTER TABLE material_gate_passes ADD COLUMN contractor_approval_notes TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'material_gate_passes' AND column_name = 'security_approved_by') THEN
    ALTER TABLE material_gate_passes ADD COLUMN security_approved_by UUID REFERENCES profiles(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'material_gate_passes' AND column_name = 'security_approved_at') THEN
    ALTER TABLE material_gate_passes ADD COLUMN security_approved_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'material_gate_passes' AND column_name = 'security_approval_notes') THEN
    ALTER TABLE material_gate_passes ADD COLUMN security_approval_notes TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'material_gate_passes' AND column_name = 'qr_generated_at') THEN
    ALTER TABLE material_gate_passes ADD COLUMN qr_generated_at TIMESTAMPTZ;
  END IF;
END $$;

-- Create RPC function to validate if user can approve a gate pass
CREATE OR REPLACE FUNCTION can_approve_gate_pass(
  p_user_id UUID,
  p_gate_pass_id UUID,
  p_approval_stage TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pass RECORD;
  v_user_roles TEXT[];
  v_requester_dept_id UUID;
  v_user_dept_id UUID;
  v_can_approve BOOLEAN := FALSE;
  v_reason TEXT := '';
BEGIN
  -- Get gate pass
  SELECT * INTO v_pass FROM material_gate_passes WHERE id = p_gate_pass_id AND deleted_at IS NULL;
  IF NOT FOUND THEN RETURN jsonb_build_object('allowed', false, 'reason', 'Gate pass not found'); END IF;
  
  -- Prevent self-approval
  IF v_pass.requested_by = p_user_id THEN 
    RETURN jsonb_build_object('allowed', false, 'reason', 'Cannot approve own request'); 
  END IF;
  
  -- Get user roles
  SELECT ARRAY_AGG(r.code) INTO v_user_roles
  FROM user_role_assignments ura
  JOIN roles r ON r.id = ura.role_id
  WHERE ura.user_id = p_user_id AND r.is_active = true;
  
  -- Get user's department
  SELECT assigned_department_id INTO v_user_dept_id FROM profiles WHERE id = p_user_id;
  
  -- EXTERNAL (Contractor) WORKFLOW
  IF NOT v_pass.is_internal_request THEN
    CASE p_approval_stage
      WHEN 'contractor' THEN
        -- Stage 1: Contractor Consultant approval
        IF v_pass.status != 'pending_contractor_approval' THEN
          RETURN jsonb_build_object('allowed', false, 'reason', 'Not at contractor approval stage');
        END IF;
        v_can_approve := 'contractor_consultant' = ANY(v_user_roles) OR 'admin' = ANY(v_user_roles);
        v_reason := 'Requires contractor_consultant role';
        
      WHEN 'dept_ack' THEN
        -- Stage 2: Department Rep acknowledgment
        IF v_pass.status != 'pending_dept_ack' THEN
          RETURN jsonb_build_object('allowed', false, 'reason', 'Not at department acknowledgment stage');
        END IF;
        -- Must be department_representative
        v_can_approve := 'department_representative' = ANY(v_user_roles) OR 'admin' = ANY(v_user_roles);
        v_reason := 'Requires department_representative role';
    END CASE;
    
  -- INTERNAL (Employee) WORKFLOW  
  ELSE
    -- Get requester's department
    SELECT assigned_department_id INTO v_requester_dept_id 
    FROM profiles WHERE id = v_pass.requested_by;
    
    CASE p_approval_stage
      WHEN 'dept_approval' THEN
        -- Stage 1: User's Dept Rep approval
        IF v_pass.status != 'pending_dept_approval' THEN
          RETURN jsonb_build_object('allowed', false, 'reason', 'Not at department approval stage');
        END IF;
        -- Must be department_representative AND in same department as requester
        v_can_approve := ('department_representative' = ANY(v_user_roles) AND v_user_dept_id = v_requester_dept_id)
                         OR 'admin' = ANY(v_user_roles);
        v_reason := 'Requires department_representative role in requester''s department';
        
      WHEN 'security' THEN
        -- Stage 2: Security Supervisor approval
        IF v_pass.status != 'pending_security_approval' THEN
          RETURN jsonb_build_object('allowed', false, 'reason', 'Not at security approval stage');
        END IF;
        v_can_approve := 'security_supervisor' = ANY(v_user_roles) 
                         OR 'security_manager' = ANY(v_user_roles)
                         OR 'admin' = ANY(v_user_roles);
        v_reason := 'Requires security_supervisor or security_manager role';
    END CASE;
  END IF;
  
  RETURN jsonb_build_object('allowed', v_can_approve, 'reason', CASE WHEN v_can_approve THEN NULL ELSE v_reason END);
END;
$$;

-- Create unified approval RPC function
CREATE OR REPLACE FUNCTION approve_gate_pass_unified(
  p_user_id UUID,
  p_gate_pass_id UUID,
  p_action TEXT, -- 'approve' or 'reject'
  p_notes TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pass RECORD;
  v_check JSONB;
  v_new_status TEXT;
  v_stage TEXT;
BEGIN
  -- Get gate pass
  SELECT * INTO v_pass FROM material_gate_passes WHERE id = p_gate_pass_id AND deleted_at IS NULL;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Gate pass not found'); END IF;
  
  -- Determine current stage based on status
  CASE v_pass.status
    WHEN 'pending_contractor_approval' THEN v_stage := 'contractor';
    WHEN 'pending_dept_ack' THEN v_stage := 'dept_ack';
    WHEN 'pending_dept_approval' THEN v_stage := 'dept_approval';
    WHEN 'pending_security_approval' THEN v_stage := 'security';
    -- Also handle legacy statuses for backward compatibility
    WHEN 'pending_pm_approval' THEN 
      -- Map legacy PM approval to new workflow
      IF v_pass.is_internal_request THEN
        v_stage := 'dept_approval';
      ELSE
        v_stage := 'contractor';
      END IF;
    WHEN 'pending_safety_approval' THEN
      IF v_pass.is_internal_request THEN
        v_stage := 'security';
      ELSE
        v_stage := 'dept_ack';
      END IF;
    ELSE RETURN jsonb_build_object('success', false, 'error', 'Gate pass not in approval stage');
  END CASE;
  
  -- Validate approval permission
  v_check := can_approve_gate_pass(p_user_id, p_gate_pass_id, v_stage);
  IF NOT (v_check->>'allowed')::boolean THEN
    RETURN jsonb_build_object('success', false, 'error', v_check->>'reason');
  END IF;
  
  -- Handle rejection (universal for all stages)
  IF p_action = 'reject' THEN
    UPDATE material_gate_passes SET
      status = 'rejected',
      rejected_by = p_user_id,
      rejected_at = NOW(),
      rejection_reason = p_notes,
      updated_at = NOW()
    WHERE id = p_gate_pass_id;
    RETURN jsonb_build_object('success', true, 'new_status', 'rejected', 'stage', v_stage);
  END IF;
  
  -- Handle approval based on stage
  CASE v_stage
    WHEN 'contractor' THEN
      -- Contractor Consultant approved → move to Dept Rep acknowledgment
      UPDATE material_gate_passes SET
        contractor_approved_by = p_user_id,
        contractor_approved_at = NOW(),
        contractor_approval_notes = p_notes,
        status = 'pending_dept_ack',
        updated_at = NOW()
      WHERE id = p_gate_pass_id;
      v_new_status := 'pending_dept_ack';
      
    WHEN 'dept_ack' THEN
      -- Dept Rep acknowledged → APPROVED + generate QR
      UPDATE material_gate_passes SET
        pm_approved_by = p_user_id,
        pm_approved_at = NOW(),
        pm_notes = p_notes,
        status = 'approved',
        qr_code_token = 'GP-' || encode(gen_random_bytes(16), 'hex'),
        qr_generated_at = NOW(),
        updated_at = NOW()
      WHERE id = p_gate_pass_id;
      v_new_status := 'approved';
      
    WHEN 'dept_approval' THEN
      -- Internal: Dept Rep approved → move to Security Supervisor
      UPDATE material_gate_passes SET
        pm_approved_by = p_user_id,
        pm_approved_at = NOW(),
        pm_notes = p_notes,
        status = 'pending_security_approval',
        updated_at = NOW()
      WHERE id = p_gate_pass_id;
      v_new_status := 'pending_security_approval';
      
    WHEN 'security' THEN
      -- Security Supervisor approved → APPROVED + generate QR
      UPDATE material_gate_passes SET
        security_approved_by = p_user_id,
        security_approved_at = NOW(),
        security_approval_notes = p_notes,
        safety_approved_by = p_user_id,
        safety_approved_at = NOW(),
        safety_notes = p_notes,
        status = 'approved',
        qr_code_token = 'GP-' || encode(gen_random_bytes(16), 'hex'),
        qr_generated_at = NOW(),
        updated_at = NOW()
      WHERE id = p_gate_pass_id;
      v_new_status := 'approved';
  END CASE;
  
  RETURN jsonb_build_object('success', true, 'new_status', v_new_status, 'stage', v_stage);
END;
$$;

-- Create function to get pending gate passes for the current user based on role
CREATE OR REPLACE FUNCTION get_user_pending_gate_passes(
  p_user_id UUID,
  p_tenant_id UUID
) RETURNS TABLE (
  gate_pass_id UUID,
  can_approve BOOLEAN,
  approval_stage TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_roles TEXT[];
  v_user_dept_id UUID;
BEGIN
  -- Get user roles
  SELECT ARRAY_AGG(r.code) INTO v_user_roles
  FROM user_role_assignments ura
  JOIN roles r ON r.id = ura.role_id
  WHERE ura.user_id = p_user_id AND r.is_active = true;
  
  -- Get user's department
  SELECT assigned_department_id INTO v_user_dept_id FROM profiles WHERE id = p_user_id;
  
  -- Return matching gate passes
  RETURN QUERY
  SELECT 
    gp.id AS gate_pass_id,
    CASE 
      -- External workflow
      WHEN NOT gp.is_internal_request AND gp.status = 'pending_contractor_approval' 
           AND ('contractor_consultant' = ANY(v_user_roles) OR 'admin' = ANY(v_user_roles))
           AND gp.requested_by != p_user_id THEN TRUE
      WHEN NOT gp.is_internal_request AND gp.status = 'pending_dept_ack' 
           AND ('department_representative' = ANY(v_user_roles) OR 'admin' = ANY(v_user_roles))
           AND gp.requested_by != p_user_id THEN TRUE
      -- Internal workflow
      WHEN gp.is_internal_request AND gp.status = 'pending_dept_approval' 
           AND (('department_representative' = ANY(v_user_roles) AND v_user_dept_id = (SELECT assigned_department_id FROM profiles WHERE id = gp.requested_by))
                OR 'admin' = ANY(v_user_roles))
           AND gp.requested_by != p_user_id THEN TRUE
      WHEN gp.is_internal_request AND gp.status = 'pending_security_approval' 
           AND ('security_supervisor' = ANY(v_user_roles) OR 'security_manager' = ANY(v_user_roles) OR 'admin' = ANY(v_user_roles))
           AND gp.requested_by != p_user_id THEN TRUE
      -- Legacy compatibility
      WHEN gp.status = 'pending_pm_approval' AND gp.approval_from_id = p_user_id THEN TRUE
      WHEN gp.status = 'pending_safety_approval' 
           AND ('security_supervisor' = ANY(v_user_roles) OR 'security_manager' = ANY(v_user_roles) OR 'admin' = ANY(v_user_roles))
           AND gp.requested_by != p_user_id THEN TRUE
      ELSE FALSE
    END AS can_approve,
    CASE 
      WHEN gp.status = 'pending_contractor_approval' THEN 'contractor'
      WHEN gp.status = 'pending_dept_ack' THEN 'dept_ack'
      WHEN gp.status = 'pending_dept_approval' THEN 'dept_approval'
      WHEN gp.status = 'pending_security_approval' THEN 'security'
      WHEN gp.status = 'pending_pm_approval' THEN 'pm'
      WHEN gp.status = 'pending_safety_approval' THEN 'safety'
      ELSE 'unknown'
    END AS approval_stage
  FROM material_gate_passes gp
  WHERE gp.tenant_id = p_tenant_id
    AND gp.deleted_at IS NULL
    AND gp.status IN (
      'pending_contractor_approval', 'pending_dept_ack', 
      'pending_dept_approval', 'pending_security_approval',
      'pending_pm_approval', 'pending_safety_approval'
    );
END;
$$;