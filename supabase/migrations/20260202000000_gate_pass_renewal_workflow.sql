-- ==============================================================================
-- GATE PASS RENEWAL & REVERSION WORKFLOW
-- Purpose: Allow security supervisors to renew expired unused passes once (24hr extension)
--          and revert passes that expire again to requester for resubmission
-- ==============================================================================

-- 1. Add renewal tracking columns to material_gate_passes
ALTER TABLE public.material_gate_passes
ADD COLUMN IF NOT EXISTS renewal_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS renewed_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS renewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS original_pass_date DATE,
ADD COLUMN IF NOT EXISTS revert_reason TEXT;

COMMENT ON COLUMN public.material_gate_passes.renewal_count IS 'Number of times this pass has been renewed (max 1)';
COMMENT ON COLUMN public.material_gate_passes.renewed_by IS 'Security supervisor who renewed the pass';
COMMENT ON COLUMN public.material_gate_passes.renewed_at IS 'Timestamp of renewal';
COMMENT ON COLUMN public.material_gate_passes.original_pass_date IS 'Original pass date before renewal';
COMMENT ON COLUMN public.material_gate_passes.revert_reason IS 'Reason for reverting pass to requester';

-- 2. Create function to check if a pass can be renewed
CREATE OR REPLACE FUNCTION public.can_renew_gate_pass(
  p_gate_pass_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pass RECORD;
  v_is_security_supervisor BOOLEAN;
  v_user_tenant_id UUID;
BEGIN
  -- Get user tenant
  SELECT tenant_id INTO v_user_tenant_id FROM profiles WHERE id = p_user_id;

  -- Get pass details
  SELECT * INTO v_pass
  FROM material_gate_passes
  WHERE id = p_gate_pass_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'Gate pass not found');
  END IF;

  -- Verify same tenant
  IF v_user_tenant_id != v_pass.tenant_id THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'Access denied');
  END IF;

  -- Check if user is security supervisor
  SELECT EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.user_id = p_user_id
      AND r.code IN ('security_supervisor', 'security_manager')
      AND r.is_active = true
      AND ura.tenant_id = v_user_tenant_id
  ) INTO v_is_security_supervisor;

  IF NOT v_is_security_supervisor THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'Only security supervisors can renew passes');
  END IF;

  -- Check if pass is expired
  IF v_pass.status != 'expired' THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'Only expired passes can be renewed');
  END IF;

  -- Check if pass was used (entry_time not null means it was used)
  IF v_pass.entry_time IS NOT NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'Cannot renew a used pass');
  END IF;

  -- Check if already renewed once
  IF COALESCE(v_pass.renewal_count, 0) >= 1 THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'Pass already renewed once. Must be resubmitted by requester.');
  END IF;

  RETURN jsonb_build_object('allowed', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_renew_gate_pass(UUID, UUID) TO authenticated;

-- 3. Create function to renew a gate pass (24hr extension)
CREATE OR REPLACE FUNCTION public.renew_gate_pass(
  p_gate_pass_id UUID,
  p_user_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_can_renew JSONB;
  v_pass RECORD;
  v_new_pass_date DATE;
BEGIN
  -- Check if renewal is allowed
  v_can_renew := can_renew_gate_pass(p_gate_pass_id, p_user_id);

  IF NOT (v_can_renew->>'allowed')::BOOLEAN THEN
    RETURN v_can_renew;
  END IF;

  -- Get current pass details
  SELECT * INTO v_pass FROM material_gate_passes WHERE id = p_gate_pass_id;

  -- Calculate new pass date (today + 24 hours, effectively tomorrow)
  v_new_pass_date := CURRENT_DATE;

  -- Update pass with renewal
  UPDATE material_gate_passes
  SET
    status = 'approved', -- Re-activate the pass
    original_pass_date = COALESCE(original_pass_date, pass_date), -- Store original date if first renewal
    pass_date = v_new_pass_date,
    renewal_count = COALESCE(renewal_count, 0) + 1,
    renewed_by = p_user_id,
    renewed_at = NOW(),
    security_approval_notes = COALESCE(security_approval_notes || E'\n', '') ||
      'Renewed on ' || to_char(NOW(), 'YYYY-MM-DD HH24:MI') ||
      COALESCE(': ' || p_notes, ''),
    updated_at = NOW()
  WHERE id = p_gate_pass_id;

  RETURN jsonb_build_object(
    'success', true,
    'new_pass_date', v_new_pass_date,
    'message', 'Pass renewed for 24 hours'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.renew_gate_pass(UUID, UUID, TEXT) TO authenticated;

-- 4. Create function to revert expired pass to requester
CREATE OR REPLACE FUNCTION public.revert_expired_pass_to_requester(
  p_gate_pass_id UUID,
  p_reason TEXT DEFAULT 'Pass expired after renewal. Please resubmit.'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pass RECORD;
BEGIN
  SELECT * INTO v_pass FROM material_gate_passes WHERE id = p_gate_pass_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'Gate pass not found');
  END IF;

  -- Only revert if pass is expired AND was already renewed once
  IF v_pass.status != 'expired' THEN
    RETURN jsonb_build_object('success', false, 'reason', 'Pass is not expired');
  END IF;

  IF COALESCE(v_pass.renewal_count, 0) < 1 THEN
    RETURN jsonb_build_object('success', false, 'reason', 'Pass has not been renewed yet');
  END IF;

  -- Update pass to resubmission_required status
  UPDATE material_gate_passes
  SET
    status = 'resubmission_required',
    revert_reason = p_reason,
    updated_at = NOW()
  WHERE id = p_gate_pass_id;

  RETURN jsonb_build_object('success', true, 'message', 'Pass reverted to requester for resubmission');
END;
$$;

GRANT EXECUTE ON FUNCTION public.revert_expired_pass_to_requester(UUID, TEXT) TO authenticated;

-- 5. Update auto-expiry function to handle renewed passes
CREATE OR REPLACE FUNCTION public.expire_old_gate_passes()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expired_count INTEGER;
  v_reverted_count INTEGER;
BEGIN
  -- Expire passes that are approved but past their pass_date
  WITH expired AS (
    UPDATE material_gate_passes
    SET status = 'expired', updated_at = NOW()
    WHERE status IN ('approved', 'used')
      AND pass_date < CURRENT_DATE
      AND deleted_at IS NULL
    RETURNING id, renewal_count
  )
  SELECT COUNT(*) INTO v_expired_count FROM expired;

  -- Auto-revert passes that expired after renewal
  WITH reverted AS (
    UPDATE material_gate_passes
    SET
      status = 'resubmission_required',
      revert_reason = 'Pass expired after renewal. Please resubmit with updated dates.',
      updated_at = NOW()
    WHERE status = 'expired'
      AND renewal_count >= 1
      AND entry_time IS NULL -- Only if never used
      AND deleted_at IS NULL
    RETURNING id
  )
  SELECT COUNT(*) INTO v_reverted_count FROM reverted;

  RETURN v_expired_count + v_reverted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.expire_old_gate_passes() TO service_role;

-- 6. Add resubmission_required to valid status values (for reference)
COMMENT ON TABLE public.material_gate_passes IS 'Gate passes for materials/equipment. Valid statuses: pending_contractor_approval, pending_dept_approval, pending_dept_ack, pending_club_mgmt_ack, pending_security_approval, approved, used, completed, expired, rejected, cancelled, resubmission_required';

-- 7. Create a view for passes requiring resubmission (for requester dashboard)
CREATE OR REPLACE VIEW public.gate_passes_requiring_resubmission AS
SELECT
  gp.*,
  p.full_name as requester_name,
  p.email as requester_email,
  proj.project_name,
  co.company_name
FROM material_gate_passes gp
LEFT JOIN profiles p ON p.id = gp.requested_by
LEFT JOIN contractor_projects proj ON proj.id = gp.project_id
LEFT JOIN contractor_companies co ON co.id = gp.company_id
WHERE gp.status = 'resubmission_required'
  AND gp.deleted_at IS NULL;

GRANT SELECT ON public.gate_passes_requiring_resubmission TO authenticated;
