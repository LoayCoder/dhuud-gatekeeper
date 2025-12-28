
-- Create trigger function for automated incident audit logging
CREATE OR REPLACE FUNCTION public.log_incident_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_changes jsonb;
BEGIN
  -- Only log if there are actual changes
  IF OLD IS DISTINCT FROM NEW THEN
    -- Calculate what changed
    v_changes := jsonb_build_object(
      'status', CASE WHEN OLD.status IS DISTINCT FROM NEW.status 
                THEN jsonb_build_object('old', OLD.status, 'new', NEW.status) END,
      'severity_v2', CASE WHEN OLD.severity_v2 IS DISTINCT FROM NEW.severity_v2 
                     THEN jsonb_build_object('old', OLD.severity_v2, 'new', NEW.severity_v2) END,
      'assigned_to', CASE WHEN OLD.assigned_to IS DISTINCT FROM NEW.assigned_to 
                     THEN jsonb_build_object('old', OLD.assigned_to, 'new', NEW.assigned_to) END
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

-- Create trigger on incidents table
DROP TRIGGER IF EXISTS incident_audit_trigger ON incidents;
CREATE TRIGGER incident_audit_trigger
AFTER UPDATE ON incidents
FOR EACH ROW EXECUTE FUNCTION log_incident_changes();

-- Add related_incident_id to hsse_notifications for better traceability
ALTER TABLE hsse_notifications
ADD COLUMN IF NOT EXISTS related_incident_id UUID REFERENCES incidents(id) ON DELETE SET NULL;

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_hsse_notifications_incident 
ON hsse_notifications(related_incident_id) WHERE related_incident_id IS NOT NULL AND deleted_at IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN hsse_notifications.related_incident_id IS 'Links notification to source HSSE incident for traceability';
