-- Step 1: Add new incident status values to the enum
ALTER TYPE incident_status ADD VALUE IF NOT EXISTS 'investigation_closed' AFTER 'pending_closure';
ALTER TYPE incident_status ADD VALUE IF NOT EXISTS 'pending_final_closure' AFTER 'investigation_closed';

-- Step 2: Add released_at column to corrective_actions for action release mechanism
ALTER TABLE corrective_actions ADD COLUMN IF NOT EXISTS released_at TIMESTAMP WITH TIME ZONE;

-- Step 3: Create function to release actions when investigation is approved
CREATE OR REPLACE FUNCTION release_actions_on_investigation_closed()
RETURNS TRIGGER AS $$
BEGIN
  -- When status changes to investigation_closed from pending_closure
  IF NEW.status = 'investigation_closed' AND OLD.status = 'pending_closure' THEN
    -- Release all corrective actions for this incident
    UPDATE corrective_actions 
    SET released_at = NOW() 
    WHERE incident_id = NEW.id 
      AND released_at IS NULL
      AND deleted_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Step 4: Create trigger for releasing actions
DROP TRIGGER IF EXISTS trigger_release_actions_on_investigation_closed ON incidents;
CREATE TRIGGER trigger_release_actions_on_investigation_closed
  AFTER UPDATE ON incidents
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION release_actions_on_investigation_closed();

-- Step 5: Create function to auto-trigger final closure when all actions are verified
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
  
  -- Only proceed if incident is in investigation_closed status
  IF v_incident_status != 'investigation_closed' THEN
    RETURN NEW;
  END IF;

  -- Count non-verified/closed actions
  SELECT COUNT(*) INTO v_action_count
  FROM corrective_actions 
  WHERE incident_id = NEW.incident_id 
    AND deleted_at IS NULL 
    AND status NOT IN ('verified', 'closed');
  
  -- If all actions are verified/closed, auto-transition to pending_final_closure
  IF v_action_count = 0 THEN
    UPDATE incidents 
    SET status = 'pending_final_closure',
        updated_at = NOW()
    WHERE id = NEW.incident_id;
    
    -- Log audit entry for auto-transition
    INSERT INTO incident_audit_logs (
      incident_id, tenant_id, actor_id, action, new_value
    ) VALUES (
      NEW.incident_id,
      NEW.tenant_id,
      auth.uid(),
      'auto_pending_final_closure',
      jsonb_build_object('triggered_by_action_id', NEW.id, 'triggered_at', NOW())
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Step 6: Create trigger for auto-final-closure check
DROP TRIGGER IF EXISTS trigger_check_auto_final_closure ON corrective_actions;
CREATE TRIGGER trigger_check_auto_final_closure
  AFTER UPDATE ON corrective_actions
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION check_auto_final_closure();

-- Step 7: Update can_close_investigation to check for investigation_closed status
CREATE OR REPLACE FUNCTION can_close_investigation(p_incident_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_actions integer;
  v_verified_actions integer;
  v_pending_actions jsonb;
  v_incident_status text;
BEGIN
  -- Get current incident status
  SELECT status::text INTO v_incident_status
  FROM incidents
  WHERE id = p_incident_id AND deleted_at IS NULL;

  -- Count total and verified actions
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status IN ('verified', 'closed'))
  INTO v_total_actions, v_verified_actions
  FROM corrective_actions
  WHERE incident_id = p_incident_id AND deleted_at IS NULL;

  -- Get list of pending actions
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', id,
    'title', title,
    'status', status
  )), '[]'::jsonb)
  INTO v_pending_actions
  FROM corrective_actions
  WHERE incident_id = p_incident_id 
    AND deleted_at IS NULL 
    AND status NOT IN ('verified', 'closed');

  RETURN jsonb_build_object(
    'can_close', v_total_actions > 0 AND v_total_actions = v_verified_actions,
    'total_actions', v_total_actions,
    'verified_actions', v_verified_actions,
    'pending_actions', v_pending_actions,
    'incident_status', v_incident_status
  );
END;
$$;