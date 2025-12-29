-- Create function to get emergency notification recipients
-- Returns security managers, supervisors, and on-duty guards for the tenant
CREATE OR REPLACE FUNCTION get_emergency_notification_recipients(
  p_tenant_id uuid,
  p_alert_type text DEFAULT 'panic',
  p_site_id uuid DEFAULT NULL
)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  phone_number text,
  email text,
  preferred_language text,
  role_code text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    p.id AS user_id,
    p.full_name,
    p.phone_number,
    p.email,
    p.preferred_language,
    r.code AS role_code
  FROM profiles p
  LEFT JOIN roles r ON p.role_id = r.id
  WHERE p.tenant_id = p_tenant_id
    AND p.is_active = true
    AND p.deleted_at IS NULL
    AND (
      -- Include all admins and HSSE managers
      p.role IN ('admin', 'hsse_manager')
      OR r.code IN ('admin', 'hsse_manager', 'security_manager', 'security_supervisor')
      -- Include supervisors for the site if specified
      OR (p_site_id IS NOT NULL AND p.role = 'supervisor')
      -- For fire emergencies, include fire wardens
      OR (p_alert_type = 'fire' AND r.code = 'fire_warden')
      -- For medical emergencies, include first aiders
      OR (p_alert_type = 'medical' AND r.code = 'first_aider')
    )
  ORDER BY 
    CASE 
      WHEN p.role = 'admin' THEN 1
      WHEN p.role = 'hsse_manager' THEN 2
      WHEN r.code = 'security_manager' THEN 3
      ELSE 4
    END;
END;
$$;

-- Create the trigger function that calls the edge function
CREATE OR REPLACE FUNCTION trigger_dispatch_emergency_alert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  edge_function_url text;
  service_role_key text;
BEGIN
  -- Get the edge function URL
  edge_function_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/dispatch-emergency-alert';
  
  -- If setting not available, use the project URL directly
  IF edge_function_url IS NULL OR edge_function_url = '' THEN
    edge_function_url := 'https://xdlowvfzhvjzbtgvurzj.supabase.co/functions/v1/dispatch-emergency-alert';
  END IF;

  -- Use pg_net to call the edge function asynchronously
  PERFORM net.http_post(
    url := edge_function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := jsonb_build_object(
      'alert_id', NEW.id,
      'record', jsonb_build_object(
        'id', NEW.id,
        'tenant_id', NEW.tenant_id,
        'alert_type', NEW.alert_type,
        'priority', NEW.priority,
        'location', NEW.location,
        'gps_lat', NEW.gps_lat,
        'gps_lng', NEW.gps_lng,
        'triggered_by', NEW.triggered_by,
        'details', NEW.details,
        'site_id', NEW.site_id,
        'branch_id', NEW.branch_id
      )
    )
  );

  -- Log the trigger execution
  RAISE LOG '[EmergencyAlertTrigger] Dispatched notification for alert: %', NEW.id;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the insert
  RAISE WARNING '[EmergencyAlertTrigger] Failed to dispatch notification: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Create the trigger on emergency_alerts table
DROP TRIGGER IF EXISTS on_emergency_alert_created ON emergency_alerts;

CREATE TRIGGER on_emergency_alert_created
  AFTER INSERT ON emergency_alerts
  FOR EACH ROW
  EXECUTE FUNCTION trigger_dispatch_emergency_alert();

-- Add comment for documentation
COMMENT ON FUNCTION get_emergency_notification_recipients IS 'Returns notification recipients for emergency alerts based on alert type and tenant';
COMMENT ON FUNCTION trigger_dispatch_emergency_alert IS 'Trigger function that calls dispatch-emergency-alert edge function when a new emergency alert is created';
COMMENT ON TRIGGER on_emergency_alert_created ON emergency_alerts IS 'Automatically dispatches notifications when an emergency alert is created';