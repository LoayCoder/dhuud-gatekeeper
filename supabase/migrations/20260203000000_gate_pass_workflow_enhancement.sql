-- ==============================================================================
-- GATE PASS WORKFLOW ENHANCEMENT
-- Purpose: Add date range validity (max 7 days), renewal features, and
--          revert-to-requester workflow for expired passes.
-- ==============================================================================

-- 1. ADD DATE RANGE COLUMNS (replacing single pass_date with start/end dates)
-- Keep pass_date for backward compatibility but add start_date and end_date
ALTER TABLE public.material_gate_passes
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE;

-- Migrate existing pass_date to start_date and end_date
UPDATE public.material_gate_passes
SET start_date = pass_date, end_date = pass_date
WHERE start_date IS NULL AND pass_date IS NOT NULL;

-- Add comments
COMMENT ON COLUMN public.material_gate_passes.start_date IS 'Start date of gate pass validity (max 7 days from start to end)';
COMMENT ON COLUMN public.material_gate_passes.end_date IS 'End date of gate pass validity (max 7 days from start_date)';
COMMENT ON COLUMN public.material_gate_passes.pass_date IS 'DEPRECATED: Use start_date and end_date for validity range';

-- 2. ADD RENEWAL TRACKING COLUMNS
ALTER TABLE public.material_gate_passes
ADD COLUMN IF NOT EXISTS renewal_count INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS renewed_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS renewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS original_end_date DATE,
ADD COLUMN IF NOT EXISTS renewal_expires_at TIMESTAMPTZ;

COMMENT ON COLUMN public.material_gate_passes.renewal_count IS 'Number of times this pass has been renewed (max 1)';
COMMENT ON COLUMN public.material_gate_passes.renewed_by IS 'Security supervisor who renewed the pass';
COMMENT ON COLUMN public.material_gate_passes.renewed_at IS 'Timestamp when pass was renewed';
COMMENT ON COLUMN public.material_gate_passes.original_end_date IS 'Original end date before renewal';
COMMENT ON COLUMN public.material_gate_passes.renewal_expires_at IS 'Expiration time after renewal (24 hours from renewal)';

-- 3. ADD pending_resubmission STATUS
-- This status is used when a renewed pass expires again
-- The requester can resubmit without re-entering data

-- 4. CREATE FUNCTION TO RENEW EXPIRED GATE PASS (Security Supervisor only)
CREATE OR REPLACE FUNCTION public.renew_expired_gate_pass(
  p_gate_pass_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pass RECORD;
  v_user_roles TEXT[];
  v_new_expires_at TIMESTAMPTZ;
BEGIN
  -- Get pass details
  SELECT * INTO v_pass
  FROM public.material_gate_passes
  WHERE id = p_gate_pass_id
  AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Gate pass not found');
  END IF;

  -- Check user roles - must be security supervisor or hsse manager
  SELECT ARRAY_AGG(r.code) INTO v_user_roles
  FROM public.user_role_assignments ura
  JOIN public.roles r ON r.id = ura.role_id
  WHERE ura.user_id = p_user_id;

  IF NOT (v_user_roles && ARRAY['security_supervisor', 'hsse_manager', 'hsse_officer', 'admin']) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only security supervisors can renew gate passes');
  END IF;

  -- Check if pass is expired
  IF v_pass.status != 'expired' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only expired passes can be renewed');
  END IF;

  -- Check if pass was used (has entry_time)
  IF v_pass.entry_time IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot renew a pass that has been used');
  END IF;

  -- Check renewal count - max 1 renewal allowed
  IF v_pass.renewal_count >= 1 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pass has already been renewed once. Requester must resubmit.');
  END IF;

  -- Calculate new expiration (24 hours from now)
  v_new_expires_at := NOW() + INTERVAL '24 hours';

  -- Update the pass
  UPDATE public.material_gate_passes
  SET
    status = 'approved',
    renewal_count = COALESCE(renewal_count, 0) + 1,
    renewed_by = p_user_id,
    renewed_at = NOW(),
    original_end_date = COALESCE(original_end_date, end_date),
    renewal_expires_at = v_new_expires_at,
    -- Extend end_date to cover the 24-hour period
    end_date = (NOW() + INTERVAL '24 hours')::DATE
  WHERE id = p_gate_pass_id;

  -- Log the renewal
  INSERT INTO public.contractor_module_audit_logs (
    tenant_id,
    entity_type,
    entity_id,
    action,
    actor_id,
    old_value,
    new_value
  ) VALUES (
    v_pass.tenant_id,
    'material_gate_pass',
    p_gate_pass_id,
    'gate_pass_renewed',
    p_user_id,
    jsonb_build_object('status', 'expired', 'end_date', v_pass.end_date),
    jsonb_build_object('status', 'approved', 'renewal_expires_at', v_new_expires_at, 'renewal_count', v_pass.renewal_count + 1)
  );

  RETURN jsonb_build_object(
    'success', true,
    'new_status', 'approved',
    'renewal_expires_at', v_new_expires_at,
    'renewal_count', COALESCE(v_pass.renewal_count, 0) + 1
  );
END;
$$;

-- 5. CREATE FUNCTION TO REVERT EXPIRED PASS TO REQUESTER
CREATE OR REPLACE FUNCTION public.revert_gate_pass_to_requester(
  p_gate_pass_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pass RECORD;
BEGIN
  -- Get pass details
  SELECT * INTO v_pass
  FROM public.material_gate_passes
  WHERE id = p_gate_pass_id
  AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Gate pass not found');
  END IF;

  -- Check if pass is expired and has been renewed once
  IF v_pass.status != 'expired' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only expired passes can be reverted');
  END IF;

  IF COALESCE(v_pass.renewal_count, 0) < 1 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pass must have been renewed at least once before reverting');
  END IF;

  -- Update status to pending_resubmission
  UPDATE public.material_gate_passes
  SET
    status = 'pending_resubmission'
  WHERE id = p_gate_pass_id;

  -- Log the revert
  INSERT INTO public.contractor_module_audit_logs (
    tenant_id,
    entity_type,
    entity_id,
    action,
    actor_id,
    old_value,
    new_value
  ) VALUES (
    v_pass.tenant_id,
    'material_gate_pass',
    p_gate_pass_id,
    'gate_pass_reverted_to_requester',
    v_pass.requested_by,
    jsonb_build_object('status', 'expired', 'renewal_count', v_pass.renewal_count),
    jsonb_build_object('status', 'pending_resubmission')
  );

  RETURN jsonb_build_object(
    'success', true,
    'new_status', 'pending_resubmission',
    'requester_id', v_pass.requested_by
  );
END;
$$;

-- 6. CREATE FUNCTION TO RESUBMIT GATE PASS (Requester only)
CREATE OR REPLACE FUNCTION public.resubmit_gate_pass(
  p_gate_pass_id UUID,
  p_user_id UUID,
  p_new_start_date DATE,
  p_new_end_date DATE,
  p_new_time_window_start TIME DEFAULT NULL,
  p_new_time_window_end TIME DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pass RECORD;
  v_date_diff INT;
BEGIN
  -- Get pass details
  SELECT * INTO v_pass
  FROM public.material_gate_passes
  WHERE id = p_gate_pass_id
  AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Gate pass not found');
  END IF;

  -- Check if user is the original requester
  IF v_pass.requested_by != p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only the original requester can resubmit');
  END IF;

  -- Check if pass is in pending_resubmission status
  IF v_pass.status != 'pending_resubmission' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pass is not pending resubmission');
  END IF;

  -- Validate date range (max 7 days)
  v_date_diff := p_new_end_date - p_new_start_date;
  IF v_date_diff < 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'End date must be after start date');
  END IF;
  IF v_date_diff > 6 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Date range cannot exceed 7 days');
  END IF;

  -- Validate start date is not in the past
  IF p_new_start_date < CURRENT_DATE THEN
    RETURN jsonb_build_object('success', false, 'error', 'Start date cannot be in the past');
  END IF;

  -- Reset and update the pass
  UPDATE public.material_gate_passes
  SET
    start_date = p_new_start_date,
    end_date = p_new_end_date,
    pass_date = p_new_start_date, -- Keep legacy field in sync
    time_window_start = COALESCE(p_new_time_window_start, time_window_start),
    time_window_end = COALESCE(p_new_time_window_end, time_window_end),
    -- Reset renewal tracking
    renewal_count = 0,
    renewed_by = NULL,
    renewed_at = NULL,
    original_end_date = NULL,
    renewal_expires_at = NULL,
    -- Reset entry/exit tracking
    entry_time = NULL,
    exit_time = NULL,
    guard_verified_by = NULL,
    guard_verified_at = NULL,
    -- Set status back to initial approval stage
    status = CASE
      WHEN is_internal_request THEN 'pending_dept_approval'
      ELSE 'pending_contractor_approval'
    END
  WHERE id = p_gate_pass_id;

  -- Log the resubmission
  INSERT INTO public.contractor_module_audit_logs (
    tenant_id,
    entity_type,
    entity_id,
    action,
    actor_id,
    old_value,
    new_value
  ) VALUES (
    v_pass.tenant_id,
    'material_gate_pass',
    p_gate_pass_id,
    'gate_pass_resubmitted',
    p_user_id,
    jsonb_build_object('status', 'pending_resubmission', 'old_start_date', v_pass.start_date, 'old_end_date', v_pass.end_date),
    jsonb_build_object('new_start_date', p_new_start_date, 'new_end_date', p_new_end_date)
  );

  RETURN jsonb_build_object(
    'success', true,
    'new_status', CASE WHEN v_pass.is_internal_request THEN 'pending_dept_approval' ELSE 'pending_contractor_approval' END,
    'start_date', p_new_start_date,
    'end_date', p_new_end_date
  );
END;
$$;

-- 7. CREATE TRIGGER TO AUTO-EXPIRE PASSES AND HANDLE RE-EXPIRATION
CREATE OR REPLACE FUNCTION public.check_gate_pass_expiration()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Skip if not in an active status
  IF NEW.status NOT IN ('approved', 'used') THEN
    RETURN NEW;
  END IF;

  -- Check if pass has expired based on end_date or renewal_expires_at
  IF NEW.renewal_expires_at IS NOT NULL THEN
    -- For renewed passes, check renewal_expires_at
    IF NEW.renewal_expires_at < NOW() AND NEW.entry_time IS NULL THEN
      -- Renewed pass expired without being used - revert to requester
      NEW.status := 'pending_resubmission';
    END IF;
  ELSIF NEW.end_date IS NOT NULL THEN
    -- For regular passes, check end_date
    IF NEW.end_date < CURRENT_DATE AND NEW.entry_time IS NULL THEN
      NEW.status := 'expired';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger (runs on UPDATE to check expiration)
DROP TRIGGER IF EXISTS trigger_check_gate_pass_expiration ON public.material_gate_passes;
CREATE TRIGGER trigger_check_gate_pass_expiration
BEFORE UPDATE ON public.material_gate_passes
FOR EACH ROW
EXECUTE FUNCTION public.check_gate_pass_expiration();

-- 8. CREATE SCHEDULED JOB FUNCTION TO EXPIRE PASSES DAILY
CREATE OR REPLACE FUNCTION public.expire_gate_passes_batch()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_expired_count INT;
  v_reverted_count INT;
BEGIN
  -- Expire passes that have passed their end_date (and never been used)
  UPDATE public.material_gate_passes
  SET status = 'expired'
  WHERE status IN ('approved')
  AND entry_time IS NULL
  AND end_date < CURRENT_DATE
  AND renewal_expires_at IS NULL
  AND deleted_at IS NULL;

  GET DIAGNOSTICS v_expired_count = ROW_COUNT;

  -- Revert renewed passes that have passed their renewal_expires_at
  UPDATE public.material_gate_passes
  SET status = 'pending_resubmission'
  WHERE status IN ('approved')
  AND entry_time IS NULL
  AND renewal_expires_at IS NOT NULL
  AND renewal_expires_at < NOW()
  AND deleted_at IS NULL;

  GET DIAGNOSTICS v_reverted_count = ROW_COUNT;

  IF v_expired_count > 0 OR v_reverted_count > 0 THEN
    RAISE NOTICE 'Gate pass expiration: % expired, % reverted to requester', v_expired_count, v_reverted_count;
  END IF;
END;
$$;

-- 9. ADD INDEX FOR EFFICIENT EXPIRATION QUERIES
CREATE INDEX IF NOT EXISTS idx_gate_passes_expiration
ON public.material_gate_passes(end_date, status, entry_time)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_gate_passes_renewal_expiration
ON public.material_gate_passes(renewal_expires_at, status, entry_time)
WHERE deleted_at IS NULL AND renewal_expires_at IS NOT NULL;

-- 10. VALIDATE DATE RANGE ON INSERT/UPDATE
CREATE OR REPLACE FUNCTION public.validate_gate_pass_dates()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_date_diff INT;
BEGIN
  -- Ensure start_date and end_date are set
  IF NEW.start_date IS NULL THEN
    NEW.start_date := COALESCE(NEW.pass_date, CURRENT_DATE);
  END IF;

  IF NEW.end_date IS NULL THEN
    NEW.end_date := NEW.start_date;
  END IF;

  -- Validate date range
  v_date_diff := NEW.end_date - NEW.start_date;

  IF v_date_diff < 0 THEN
    RAISE EXCEPTION 'End date must be on or after start date';
  END IF;

  IF v_date_diff > 6 THEN
    RAISE EXCEPTION 'Date range cannot exceed 7 days (got % days)', v_date_diff + 1;
  END IF;

  -- Keep pass_date in sync for backward compatibility
  NEW.pass_date := NEW.start_date;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_validate_gate_pass_dates ON public.material_gate_passes;
CREATE TRIGGER trigger_validate_gate_pass_dates
BEFORE INSERT OR UPDATE OF start_date, end_date ON public.material_gate_passes
FOR EACH ROW
EXECUTE FUNCTION public.validate_gate_pass_dates();

-- 11. GRANT EXECUTE PERMISSIONS
GRANT EXECUTE ON FUNCTION public.renew_expired_gate_pass(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revert_gate_pass_to_requester(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resubmit_gate_pass(UUID, UUID, DATE, DATE, TIME, TIME) TO authenticated;
