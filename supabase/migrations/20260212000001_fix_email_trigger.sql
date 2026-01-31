-- Fix Email Race Condition: Trigger for Action Notification
-- Only send email if the parent incident is RELEASED, CLOSED, or APPROVED

CREATE OR REPLACE FUNCTION public.handle_action_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_project_url text;
  v_auth_header text;
BEGIN
  -- Attempt to get the project URL from a setting, or default to a placeholder
  -- Ideally this should be configured in app.settings
  v_project_url := current_setting('app.settings.edge_function_base_url', true);

  -- Fallback if setting not present (User must replace [PROJECT_REF] if not using settings)
  IF v_project_url IS NULL THEN
    v_project_url := 'https://[PROJECT_REF].supabase.co/functions/v1';
  END IF;

  -- Get the current request's authorization header to pass through
  v_auth_header := current_setting('request.header.authorization', true);

  -- If triggered by system (no auth header), we might need a fallback or skip
  IF v_auth_header IS NULL THEN
    -- Fallback for system events - this requires the Edge Function to accept Anon key if we hardcode it,
    -- or we skip. For now, we assume user-initiated actions have a header.
    RETURN NEW;
  END IF;

  -- Logic: Only send email if the parent incident is in a visible state
  IF EXISTS (
    SELECT 1 FROM incidents i
    WHERE i.id = NEW.incident_id
    AND i.status::text IN ('released', 'closed', 'approved', 'investigation_closed', 'contractor_violation_enforced', 'pending_final_closure')
  ) THEN
    -- Call Edge Function via pg_net
    PERFORM net.http_post(
      url := v_project_url || '/send-action-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', v_auth_header
      ),
      body := jsonb_build_object('action_id', NEW.id)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS on_action_created_check_notify ON corrective_actions;
CREATE TRIGGER on_action_created_check_notify
AFTER INSERT ON corrective_actions
FOR EACH ROW EXECUTE FUNCTION handle_action_notification();
