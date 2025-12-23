-- Fix search_path security warning for the function
CREATE OR REPLACE FUNCTION log_notification_matrix_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.security_audit_logs (
    tenant_id, 
    actor_id, 
    action,
    action_category,
    entity_type,
    entity_id,
    table_name, 
    old_value, 
    new_value,
    created_at
  ) VALUES (
    COALESCE(NEW.tenant_id, OLD.tenant_id),
    auth.uid(),
    TG_OP,
    'data_change',
    'notification_matrix',
    COALESCE(NEW.id::text, OLD.id::text),
    'incident_notification_matrix',
    CASE WHEN TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN to_jsonb(NEW) ELSE NULL END,
    now()
  );
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;