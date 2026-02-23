
-- ================================================
-- C11: Auto-populate investigation_started_at trigger
-- ================================================
CREATE OR REPLACE FUNCTION public.set_investigation_started_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'investigation_in_progress'
     AND (OLD.status IS DISTINCT FROM 'investigation_in_progress')
     AND NEW.investigation_started_at IS NULL THEN
    NEW.investigation_started_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_investigation_started_at ON incidents;
CREATE TRIGGER trg_set_investigation_started_at
  BEFORE UPDATE ON incidents
  FOR EACH ROW
  EXECUTE FUNCTION public.set_investigation_started_at();

-- ================================================
-- C11: Backfill existing investigation_in_progress incidents
-- ================================================
UPDATE incidents
SET investigation_started_at = COALESCE(
  (SELECT MIN(created_at) FROM incident_audit_logs
   WHERE incident_id = incidents.id
     AND action IN ('status_changed', 'investigation_assigned')),
  updated_at, created_at
)
WHERE status = 'investigation_in_progress'
  AND investigation_started_at IS NULL
  AND deleted_at IS NULL;

-- ================================================
-- C18: Upgraded verify_hsse_manager_access 
-- Now checks all roles in 'hsse_management' category
-- ================================================
DROP FUNCTION IF EXISTS public.verify_hsse_manager_access(UUID, UUID);

CREATE OR REPLACE FUNCTION public.verify_hsse_manager_access(
  p_user_id UUID,
  p_incident_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role_code TEXT;
  v_branch_id UUID;
  v_incident_branch UUID;
  v_category_roles TEXT[];
BEGIN
  -- Try to get roles from hsse_management category
  SELECT rc.roles INTO v_category_roles
  FROM role_categories rc
  WHERE rc.category_name = 'hsse_management'
  LIMIT 1;

  -- Fallback if no category exists
  IF v_category_roles IS NULL THEN
    v_category_roles := ARRAY['hsse_manager'];
  END IF;

  -- Check if user has any of the hsse_management roles
  SELECT r.code, ura.branch_id
  INTO v_role_code, v_branch_id
  FROM user_role_assignments ura
  JOIN roles r ON r.id = ura.role_id
  WHERE ura.user_id = p_user_id
    AND r.code = ANY(v_category_roles)
  LIMIT 1;

  IF v_role_code IS NULL THEN
    RETURN jsonb_build_object(
      'authorized', false,
      'reason', 'User does not have any hsse_management role',
      'checked_roles', to_jsonb(v_category_roles)
    );
  END IF;

  -- If incident provided, verify branch match
  IF p_incident_id IS NOT NULL THEN
    SELECT branch_id INTO v_incident_branch
    FROM incidents
    WHERE id = p_incident_id AND deleted_at IS NULL;

    IF v_incident_branch IS NULL THEN
      RETURN jsonb_build_object('authorized', false, 'reason', 'Incident not found');
    END IF;

    IF v_branch_id IS NOT NULL AND v_branch_id != v_incident_branch THEN
      RETURN jsonb_build_object(
        'authorized', false,
        'reason', 'Branch mismatch',
        'user_branch', v_branch_id,
        'incident_branch', v_incident_branch
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'authorized', true,
    'role', v_role_code,
    'branch_id', v_branch_id
  );
END;
$$;
