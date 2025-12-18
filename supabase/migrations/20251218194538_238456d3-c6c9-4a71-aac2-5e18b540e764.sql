-- Create trigger function for auto-logging PTW permit status changes
CREATE OR REPLACE FUNCTION public.log_ptw_permit_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Log status changes
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.ptw_audit_logs (
      tenant_id, permit_id, project_id, actor_id, 
      action, old_value, new_value, ip_address
    ) VALUES (
      NEW.tenant_id, 
      NEW.id, 
      NEW.project_id,
      NULLIF(current_setting('request.jwt.claims', true)::json->>'sub', '')::uuid,
      'status_change',
      jsonb_build_object(
        'status', OLD.status, 
        'updated_at', OLD.updated_at,
        'actual_start_time', OLD.actual_start_time,
        'actual_end_time', OLD.actual_end_time
      ),
      jsonb_build_object(
        'status', NEW.status, 
        'updated_at', NEW.updated_at,
        'actual_start_time', NEW.actual_start_time,
        'actual_end_time', NEW.actual_end_time
      ),
      current_setting('request.headers', true)::json->>'x-forwarded-for'
    );
  END IF;
  
  -- Log permit creation
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.ptw_audit_logs (
      tenant_id, permit_id, project_id, actor_id, 
      action, old_value, new_value, ip_address
    ) VALUES (
      NEW.tenant_id, 
      NEW.id, 
      NEW.project_id,
      NULLIF(current_setting('request.jwt.claims', true)::json->>'sub', '')::uuid,
      'permit_created',
      NULL,
      jsonb_build_object(
        'status', NEW.status,
        'type_id', NEW.type_id,
        'reference_id', NEW.reference_id,
        'planned_start_time', NEW.planned_start_time,
        'planned_end_time', NEW.planned_end_time
      ),
      current_setting('request.headers', true)::json->>'x-forwarded-for'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop existing trigger if exists to avoid conflicts
DROP TRIGGER IF EXISTS trg_log_ptw_permit_changes ON public.ptw_permits;

-- Create trigger for INSERT and UPDATE
CREATE TRIGGER trg_log_ptw_permit_changes
  AFTER INSERT OR UPDATE ON public.ptw_permits
  FOR EACH ROW
  EXECUTE FUNCTION public.log_ptw_permit_changes();