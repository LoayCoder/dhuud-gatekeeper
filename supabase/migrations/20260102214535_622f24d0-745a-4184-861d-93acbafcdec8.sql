-- Fix search_path for the sync_emergency_alert_status function
CREATE OR REPLACE FUNCTION sync_emergency_alert_status()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.resolved_at IS NOT NULL THEN
    NEW.status := 'resolved';
  ELSIF NEW.acknowledged_at IS NOT NULL THEN
    NEW.status := 'acknowledged';
  ELSE
    NEW.status := 'pending';
  END IF;
  RETURN NEW;
END;
$$;