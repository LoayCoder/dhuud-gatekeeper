-- Fix: Foreign Key Violation on Observation Submission
-- Root cause: BEFORE INSERT trigger tries to insert audit logs before the incident row exists

-- Step 1: Remove duplicate trigger
DROP TRIGGER IF EXISTS trigger_auto_route_observation ON public.incidents;

-- Step 2: Update the BEFORE INSERT function to ONLY handle routing (no audit logging)
CREATE OR REPLACE FUNCTION auto_route_observation_on_submit()
RETURNS TRIGGER AS $$
DECLARE
  v_branch_id UUID;
  v_contractor_consultant_id UUID;
  v_dept_rep_id UUID;
  v_is_contractor_related BOOLEAN;
BEGIN
  -- Only process observations being submitted (status changing to 'reported')
  IF NEW.event_type != 'observation' THEN
    RETURN NEW;
  END IF;
  
  -- Only process when status is being set to 'reported'
  IF NEW.status != 'reported' THEN
    RETURN NEW;
  END IF;

  v_branch_id := NEW.branch_id;
  v_is_contractor_related := (NEW.related_contractor_company_id IS NOT NULL);

  -- Route based on whether it's contractor-related
  IF v_is_contractor_related THEN
    -- Find Contractor Consultant for this branch
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
    -- Find Dept Rep for this branch
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

-- Step 3: Create AFTER INSERT function for audit logging
CREATE OR REPLACE FUNCTION log_observation_routing_audit()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log for observations that were routed
  IF NEW.event_type = 'observation' AND NEW.approval_manager_id IS NOT NULL AND NEW.status = 'pending_dept_rep_approval' THEN
    INSERT INTO incident_audit_logs (
      incident_id, 
      tenant_id, 
      actor_id, 
      action, 
      details,
      created_at
    ) VALUES (
      NEW.id, 
      NEW.tenant_id, 
      COALESCE(auth.uid(), NEW.reporter_id),
      'auto_routed_observation',
      jsonb_build_object(
        'is_contractor_related', NEW.related_contractor_company_id IS NOT NULL,
        'assigned_to', NEW.approval_manager_id,
        'status', NEW.status,
        'branch_id', NEW.branch_id
      ),
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Step 4: Create AFTER INSERT trigger for audit logging
DROP TRIGGER IF EXISTS trg_log_observation_routing ON public.incidents;
CREATE TRIGGER trg_log_observation_routing
  AFTER INSERT ON public.incidents
  FOR EACH ROW
  EXECUTE FUNCTION log_observation_routing_audit();