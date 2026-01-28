-- =========================================================================
-- Fix Contractor Observation Routing Trigger
-- Consolidates and fixes auto_route_observation_on_submit() function
-- Ensures contractor observations route to Contractor Consultant first
-- =========================================================================

-- Drop and recreate the function with proper role table joins
CREATE OR REPLACE FUNCTION public.auto_route_observation_on_submit()
RETURNS TRIGGER AS $$
DECLARE
  v_assigned_to UUID;
  v_new_status TEXT;
  v_branch_id UUID;
BEGIN
  -- Only process observations on submission
  IF NEW.event_type != 'observation' OR NEW.status != 'submitted' THEN
    RETURN NEW;
  END IF;

  -- Skip if already has approval_manager_id (manual assignment)
  IF NEW.approval_manager_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Resolve branch_id: prefer direct branch_id, fallback to site's branch
  v_branch_id := COALESCE(NEW.branch_id, 
    (SELECT branch_id FROM sites WHERE id = NEW.site_id AND deleted_at IS NULL));

  -- =======================================================================
  -- CONTRACTOR OBSERVATIONS: Route to Contractor Consultant FIRST
  -- =======================================================================
  IF NEW.related_contractor_company_id IS NOT NULL THEN
    -- Find a Contractor Consultant for this branch
    -- Uses proper join with roles table (r.code, not ura.role text column)
    SELECT ura.user_id INTO v_assigned_to
    FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    JOIN profiles p ON p.id = ura.user_id
    WHERE ura.tenant_id = NEW.tenant_id
      AND (ura.branch_id = v_branch_id OR ura.branch_id IS NULL)  -- Branch-specific or tenant-wide
      AND r.code = 'contractor_consultant'
      AND r.is_active = true
      AND p.deleted_at IS NULL
    ORDER BY 
      CASE WHEN ura.branch_id = v_branch_id THEN 0 ELSE 1 END,  -- Prefer branch-specific
      ura.created_at  -- Then by assignment date
    LIMIT 1;
    
    IF v_assigned_to IS NOT NULL THEN
      -- Use expert_screening status (the enum value for contractor consultant screening)
      v_new_status := 'expert_screening';
    END IF;
  END IF;

  -- =======================================================================
  -- NON-CONTRACTOR OR FALLBACK: Route to Department Representative
  -- =======================================================================
  IF v_assigned_to IS NULL THEN
    SELECT ura.user_id INTO v_assigned_to
    FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    JOIN profiles p ON p.id = ura.user_id
    WHERE ura.tenant_id = NEW.tenant_id
      AND (ura.branch_id = v_branch_id OR ura.branch_id IS NULL)
      AND r.code = 'department_representative'
      AND r.is_active = true
      AND p.deleted_at IS NULL
    ORDER BY 
      CASE WHEN ura.branch_id = v_branch_id THEN 0 ELSE 1 END,
      ura.created_at
    LIMIT 1;
    
    v_new_status := 'pending_dept_rep_approval';
  END IF;

  -- =======================================================================
  -- Apply routing if we found an assignee
  -- =======================================================================
  IF v_assigned_to IS NOT NULL THEN
    NEW.approval_manager_id := v_assigned_to;
    NEW.status := v_new_status;
    
    -- Log routing for debugging
    RAISE LOG 'auto_route_observation_on_submit: Routed observation % to % with status %', 
              NEW.id, v_assigned_to, v_new_status;
  ELSE
    RAISE LOG 'auto_route_observation_on_submit: No assignee found for observation % in tenant %', 
              NEW.id, NEW.tenant_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Ensure trigger exists on UPDATE (fires when status changes from any other status to submitted)
DROP TRIGGER IF EXISTS trigger_auto_route_observation_on_submit ON public.incidents;
CREATE TRIGGER trigger_auto_route_observation_on_submit
  BEFORE UPDATE ON public.incidents
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'submitted')
  EXECUTE FUNCTION public.auto_route_observation_on_submit();

-- Also create a version that fires on INSERT for direct submissions
DROP TRIGGER IF EXISTS trigger_auto_route_observation_on_insert ON public.incidents;
CREATE TRIGGER trigger_auto_route_observation_on_insert
  BEFORE INSERT ON public.incidents
  FOR EACH ROW
  WHEN (NEW.status = 'submitted' AND NEW.event_type = 'observation')
  EXECUTE FUNCTION public.auto_route_observation_on_submit();