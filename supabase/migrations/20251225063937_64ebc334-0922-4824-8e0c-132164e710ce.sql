-- Add new status for observations with pending actions
ALTER TYPE incident_status ADD VALUE IF NOT EXISTS 'observation_actions_pending' AFTER 'pending_dept_rep_approval';

-- Update the trigger to handle observations as well as incidents
CREATE OR REPLACE FUNCTION check_auto_final_closure()
RETURNS TRIGGER AS $$
DECLARE
  v_all_verified BOOLEAN;
  v_incident_status TEXT;
  v_action_count INTEGER;
BEGIN
  -- Only proceed if action status changed to verified or closed
  IF NEW.status NOT IN ('verified', 'closed') THEN
    RETURN NEW;
  END IF;

  -- Skip if no incident_id
  IF NEW.incident_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get incident status
  SELECT status::text INTO v_incident_status 
  FROM incidents 
  WHERE id = NEW.incident_id AND deleted_at IS NULL;
  
  -- Handle both incidents (investigation_closed) AND observations (observation_actions_pending)
  IF v_incident_status NOT IN ('investigation_closed', 'observation_actions_pending') THEN
    RETURN NEW;
  END IF;

  -- Count non-verified/closed actions
  SELECT COUNT(*) INTO v_action_count
  FROM corrective_actions 
  WHERE incident_id = NEW.incident_id 
    AND deleted_at IS NULL 
    AND status NOT IN ('verified', 'closed');
  
  -- If all actions are verified/closed
  IF v_action_count = 0 THEN
    IF v_incident_status = 'investigation_closed' THEN
      -- Incidents: go to pending_final_closure for manager approval
      UPDATE incidents 
      SET status = 'pending_final_closure', updated_at = NOW()
      WHERE id = NEW.incident_id;
    ELSE
      -- Observations: directly close (no manager approval needed)
      UPDATE incidents 
      SET status = 'closed', updated_at = NOW()
      WHERE id = NEW.incident_id;
    END IF;
    
    -- Log audit entry
    INSERT INTO incident_audit_logs (
      incident_id, tenant_id, actor_id, action, new_value
    ) VALUES (
      NEW.incident_id,
      NEW.tenant_id,
      auth.uid(),
      'auto_closed_actions_complete',
      jsonb_build_object('triggered_by_action_id', NEW.id, 'triggered_at', NOW())
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;