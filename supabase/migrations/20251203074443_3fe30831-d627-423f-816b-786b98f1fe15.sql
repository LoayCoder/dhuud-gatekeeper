-- Function to log subscription events automatically
CREATE OR REPLACE FUNCTION public.log_subscription_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  event subscription_event_type;
  desc_text TEXT;
  prev_val JSONB;
  new_val JSONB;
BEGIN
  -- Check for plan changes
  IF OLD.plan_id IS DISTINCT FROM NEW.plan_id THEN
    event := 'plan_changed';
    desc_text := 'Subscription plan changed';
    prev_val := jsonb_build_object('plan_id', OLD.plan_id);
    new_val := jsonb_build_object('plan_id', NEW.plan_id);
    
    INSERT INTO subscription_events (tenant_id, event_type, description, previous_value, new_value, performed_by)
    VALUES (NEW.id, event, desc_text, prev_val, new_val, auth.uid());
  END IF;

  -- Check for subscription status changes
  IF OLD.subscription_status IS DISTINCT FROM NEW.subscription_status THEN
    CASE NEW.subscription_status
      WHEN 'active' THEN event := 'subscription_activated';
      WHEN 'canceled' THEN event := 'subscription_canceled';
      WHEN 'trialing' THEN event := 'trial_started';
      ELSE event := 'plan_changed';
    END CASE;
    
    -- Check if trial ended
    IF OLD.subscription_status = 'trialing' AND NEW.subscription_status != 'trialing' THEN
      INSERT INTO subscription_events (tenant_id, event_type, description, previous_value, new_value, performed_by)
      VALUES (NEW.id, 'trial_ended', 'Trial period ended', 
              jsonb_build_object('status', OLD.subscription_status),
              jsonb_build_object('status', NEW.subscription_status),
              auth.uid());
    END IF;
    
    desc_text := 'Subscription status changed to ' || COALESCE(NEW.subscription_status, 'inactive');
    prev_val := jsonb_build_object('status', OLD.subscription_status);
    new_val := jsonb_build_object('status', NEW.subscription_status);
    
    INSERT INTO subscription_events (tenant_id, event_type, description, previous_value, new_value, performed_by)
    VALUES (NEW.id, event, desc_text, prev_val, new_val, auth.uid());
  END IF;

  -- Check for user limit changes
  IF OLD.max_users_override IS DISTINCT FROM NEW.max_users_override THEN
    event := 'user_limit_changed';
    desc_text := 'User limit changed';
    prev_val := jsonb_build_object('max_users', OLD.max_users_override);
    new_val := jsonb_build_object('max_users', NEW.max_users_override);
    
    INSERT INTO subscription_events (tenant_id, event_type, description, previous_value, new_value, performed_by)
    VALUES (NEW.id, event, desc_text, prev_val, new_val, auth.uid());
  END IF;

  -- Check for trial date changes (new trial started)
  IF OLD.trial_start_date IS NULL AND NEW.trial_start_date IS NOT NULL THEN
    INSERT INTO subscription_events (tenant_id, event_type, description, previous_value, new_value, performed_by)
    VALUES (NEW.id, 'trial_started', 'Trial period started',
            NULL,
            jsonb_build_object('trial_start', NEW.trial_start_date, 'trial_end', NEW.trial_end_date),
            auth.uid());
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on tenants table
DROP TRIGGER IF EXISTS trigger_log_subscription_events ON public.tenants;
CREATE TRIGGER trigger_log_subscription_events
  AFTER UPDATE ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.log_subscription_event();