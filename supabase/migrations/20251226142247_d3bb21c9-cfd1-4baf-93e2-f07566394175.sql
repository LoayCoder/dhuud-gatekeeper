-- ============================================
-- HSSE Production Finalization Migration
-- Auto-close trigger for L3-L4 observations
-- RLS function search_path fixes
-- ============================================

-- 1. Create or Replace Auto-Close Trigger for Observations (L3-L4 only)
-- L5 requires manual HSSE Manager approval and should NOT auto-close
CREATE OR REPLACE FUNCTION public.auto_close_observation_on_validation()
RETURNS TRIGGER AS $$
DECLARE
  v_all_actions_closed BOOLEAN;
  v_severity TEXT;
  v_closure_requires_manager BOOLEAN;
BEGIN
  -- Only proceed if HSSE validation was just accepted
  IF NEW.hsse_validation_status = 'accepted' AND 
     (OLD.hsse_validation_status IS NULL OR OLD.hsse_validation_status != 'accepted') THEN
    
    -- Get severity and closure requirement
    SELECT severity_v2, COALESCE(closure_requires_manager, false)
    INTO v_severity, v_closure_requires_manager
    FROM incidents
    WHERE id = NEW.id;
    
    -- L5 (Catastrophic) requires manual manager approval - do NOT auto-close
    IF v_closure_requires_manager OR v_severity = 'level_5' THEN
      -- Move to pending_closure_approval instead of auto-closing
      IF NEW.status != 'pending_closure_approval' AND NEW.status != 'closed' THEN
        UPDATE incidents 
        SET status = 'pending_closure_approval',
            updated_at = now()
        WHERE id = NEW.id;
      END IF;
      RETURN NEW;
    END IF;
    
    -- For L3-L4: Check if all corrective actions are closed
    SELECT NOT EXISTS (
      SELECT 1 FROM corrective_actions 
      WHERE incident_id = NEW.id 
      AND deleted_at IS NULL 
      AND status NOT IN ('completed', 'closed', 'verified')
    ) INTO v_all_actions_closed;
    
    -- Auto-close if all actions are closed AND HSSE validated
    IF v_all_actions_closed THEN
      UPDATE incidents 
      SET status = 'closed',
          closed_at = now(),
          updated_at = now()
      WHERE id = NEW.id AND status != 'closed';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Create trigger if not exists
DROP TRIGGER IF EXISTS trigger_auto_close_on_hsse_validation ON incidents;
CREATE TRIGGER trigger_auto_close_on_hsse_validation
  AFTER UPDATE OF hsse_validation_status ON incidents
  FOR EACH ROW
  EXECUTE FUNCTION auto_close_observation_on_validation();

-- 3. Also create trigger for when actions are completed (to check auto-close)
CREATE OR REPLACE FUNCTION public.check_auto_close_on_action_complete()
RETURNS TRIGGER AS $$
DECLARE
  v_incident_id UUID;
  v_hsse_validation_status TEXT;
  v_severity TEXT;
  v_closure_requires_manager BOOLEAN;
  v_all_actions_closed BOOLEAN;
BEGIN
  -- Get the incident this action belongs to
  v_incident_id := COALESCE(NEW.incident_id, OLD.incident_id);
  
  IF v_incident_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Get incident details
  SELECT hsse_validation_status, severity_v2, COALESCE(closure_requires_manager, false)
  INTO v_hsse_validation_status, v_severity, v_closure_requires_manager
  FROM incidents
  WHERE id = v_incident_id AND deleted_at IS NULL;
  
  -- Only auto-close for L3-L4 (not L5)
  IF v_closure_requires_manager OR v_severity = 'level_5' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Check if HSSE validation is accepted
  IF v_hsse_validation_status != 'accepted' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Check if all actions are now closed
  SELECT NOT EXISTS (
    SELECT 1 FROM corrective_actions 
    WHERE incident_id = v_incident_id 
    AND deleted_at IS NULL 
    AND status NOT IN ('completed', 'closed', 'verified')
  ) INTO v_all_actions_closed;
  
  -- Auto-close the incident
  IF v_all_actions_closed THEN
    UPDATE incidents 
    SET status = 'closed',
        closed_at = now(),
        updated_at = now()
    WHERE id = v_incident_id AND status NOT IN ('closed', 'pending_closure_approval');
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on corrective_actions
DROP TRIGGER IF EXISTS trigger_check_auto_close_on_action ON corrective_actions;
CREATE TRIGGER trigger_check_auto_close_on_action
  AFTER UPDATE OF status ON corrective_actions
  FOR EACH ROW
  WHEN (NEW.status IN ('completed', 'closed', 'verified'))
  EXECUTE FUNCTION check_auto_close_on_action_complete();

-- 4. Fix existing functions with search_path issues
-- Fix get_auth_tenant_id
CREATE OR REPLACE FUNCTION public.get_auth_tenant_id()
RETURNS UUID AS $$
DECLARE
  tenant UUID;
BEGIN
  SELECT tenant_id INTO tenant
  FROM public.profiles
  WHERE id = auth.uid();
  RETURN tenant;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Fix reset_notification_matrix_to_defaults
CREATE OR REPLACE FUNCTION public.reset_notification_matrix_to_defaults(p_tenant_id UUID)
RETURNS void AS $$
BEGIN
  -- Delete existing tenant-specific rules
  DELETE FROM public.incident_notification_matrix 
  WHERE tenant_id = p_tenant_id;
  
  -- Copy default rules (tenant_id IS NULL) to the tenant
  INSERT INTO public.incident_notification_matrix (
    tenant_id, stakeholder_role, severity_level, channels, is_active, condition_type
  )
  SELECT 
    p_tenant_id,
    stakeholder_role,
    severity_level,
    channels,
    is_active,
    condition_type
  FROM public.incident_notification_matrix
  WHERE tenant_id IS NULL AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Add validation trigger for non-draft incidents requiring site_id/department_id
CREATE OR REPLACE FUNCTION public.validate_incident_required_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Skip validation for drafts
  IF NEW.status = 'draft' THEN
    RETURN NEW;
  END IF;
  
  -- Require site_id for non-draft incidents
  IF NEW.site_id IS NULL THEN
    RAISE EXCEPTION 'site_id is required for non-draft incidents';
  END IF;
  
  -- Department is recommended but not strictly required (some incidents may be site-wide)
  -- IF NEW.department_id IS NULL THEN
  --   RAISE EXCEPTION 'department_id is required for non-draft incidents';
  -- END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create validation trigger
DROP TRIGGER IF EXISTS trigger_validate_incident_fields ON incidents;
CREATE TRIGGER trigger_validate_incident_fields
  BEFORE INSERT OR UPDATE ON incidents
  FOR EACH ROW
  EXECUTE FUNCTION validate_incident_required_fields();

-- 6. Add email channel to HSSE Manager for Level 5 if not already present
UPDATE public.incident_notification_matrix
SET channels = ARRAY(SELECT DISTINCT unnest(channels || ARRAY['email']))
WHERE stakeholder_role = 'hsse_manager' 
AND severity_level = 'level_5'
AND NOT ('email' = ANY(channels));

-- Also ensure HSSE Manager gets WhatsApp + Email for L5 in defaults
UPDATE public.incident_notification_matrix
SET channels = ARRAY['whatsapp', 'push', 'email']
WHERE stakeholder_role = 'hsse_manager' 
AND severity_level = 'level_5'
AND tenant_id IS NULL;