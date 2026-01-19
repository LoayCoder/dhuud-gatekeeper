-- Fix: Update trigger to use valid enum value 'submitted' instead of 'reported'

CREATE OR REPLACE FUNCTION auto_route_observation_on_submit()
RETURNS TRIGGER AS $$
DECLARE
  v_branch_id UUID;
  v_contractor_consultant_id UUID;
  v_dept_rep_id UUID;
  v_is_contractor_related BOOLEAN;
BEGIN
  -- Only process observations
  IF NEW.event_type != 'observation' THEN
    RETURN NEW;
  END IF;
  
  -- FIX: Check for 'submitted' (valid enum value) instead of 'reported'
  IF NEW.status != 'submitted' THEN
    RETURN NEW;
  END IF;

  v_branch_id := NEW.branch_id;
  v_is_contractor_related := (NEW.related_contractor_company_id IS NOT NULL);

  -- Route based on whether it's contractor-related
  IF v_is_contractor_related THEN
    SELECT p.id INTO v_contractor_consultant_id
    FROM profiles p
    WHERE p.branch_id = v_branch_id
      AND p.tenant_id = NEW.tenant_id
      AND p.role = 'contractor_consultant'
      AND p.deleted_at IS NULL
    LIMIT 1;

    IF v_contractor_consultant_id IS NOT NULL THEN
      NEW.approval_manager_id := v_contractor_consultant_id;
      NEW.status := 'pending_dept_rep_approval';
    END IF;
  ELSE
    SELECT p.id INTO v_dept_rep_id
    FROM profiles p
    WHERE p.branch_id = v_branch_id
      AND p.tenant_id = NEW.tenant_id
      AND p.role = 'dept_rep'
      AND p.deleted_at IS NULL
    LIMIT 1;

    IF v_dept_rep_id IS NOT NULL THEN
      NEW.approval_manager_id := v_dept_rep_id;
      NEW.status := 'pending_dept_rep_approval';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;