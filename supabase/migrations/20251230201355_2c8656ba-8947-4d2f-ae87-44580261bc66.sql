-- Fix the log_incident_changes trigger function to not reference non-existent assigned_to column
CREATE OR REPLACE FUNCTION log_incident_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_changes jsonb;
BEGIN
  -- Only log if there are actual changes
  IF OLD IS DISTINCT FROM NEW THEN
    -- Calculate what changed (only columns that exist on incidents table)
    v_changes := jsonb_build_object(
      'status', CASE WHEN OLD.status IS DISTINCT FROM NEW.status 
                THEN jsonb_build_object('old', OLD.status, 'new', NEW.status) END,
      'severity_v2', CASE WHEN OLD.severity_v2 IS DISTINCT FROM NEW.severity_v2 
                     THEN jsonb_build_object('old', OLD.severity_v2, 'new', NEW.severity_v2) END,
      'description', CASE WHEN OLD.description IS DISTINCT FROM NEW.description 
                     THEN jsonb_build_object('old', OLD.description, 'new', NEW.description) END,
      'location', CASE WHEN OLD.location IS DISTINCT FROM NEW.location 
                  THEN jsonb_build_object('old', OLD.location, 'new', NEW.location) END
    );
    
    -- Remove null entries
    v_changes := (SELECT jsonb_object_agg(key, value) 
                  FROM jsonb_each(v_changes) 
                  WHERE value IS NOT NULL);
    
    -- Only insert if we have changes to log
    IF v_changes IS NOT NULL AND v_changes != '{}'::jsonb THEN
      INSERT INTO incident_audit_logs (
        incident_id, 
        tenant_id, 
        actor_id, 
        action, 
        old_value, 
        new_value
      ) VALUES (
        NEW.id, 
        NEW.tenant_id, 
        COALESCE(auth.uid(), NEW.reporter_id),
        'auto_update',
        to_jsonb(OLD),
        to_jsonb(NEW)
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;