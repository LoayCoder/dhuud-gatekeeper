-- Create audit trigger function for hsse_assets table
-- This function automatically logs all INSERT and UPDATE operations to asset_audit_logs
CREATE OR REPLACE FUNCTION public.log_asset_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.asset_audit_logs (
      tenant_id, 
      asset_id, 
      action, 
      new_value, 
      actor_id, 
      created_at
    )
    VALUES (
      NEW.tenant_id, 
      NEW.id, 
      'created', 
      to_jsonb(NEW) - 'tenant_id', -- Exclude tenant_id from logged data for security
      NEW.created_by, 
      NOW()
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Determine action type based on deleted_at status
    INSERT INTO public.asset_audit_logs (
      tenant_id, 
      asset_id, 
      action, 
      old_value, 
      new_value, 
      actor_id, 
      created_at
    )
    VALUES (
      NEW.tenant_id, 
      NEW.id, 
      CASE 
        WHEN NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN 'deleted'
        WHEN NEW.status IS DISTINCT FROM OLD.status THEN 'status_changed'
        WHEN NEW.condition_rating IS DISTINCT FROM OLD.condition_rating THEN 'condition_updated'
        WHEN NEW.branch_id IS DISTINCT FROM OLD.branch_id OR NEW.site_id IS DISTINCT FROM OLD.site_id THEN 'location_changed'
        ELSE 'updated'
      END,
      to_jsonb(OLD) - 'tenant_id',
      to_jsonb(NEW) - 'tenant_id',
      COALESCE(NEW.updated_by, NEW.created_by),
      NOW()
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trg_asset_audit ON public.hsse_assets;

-- Attach trigger to hsse_assets table
CREATE TRIGGER trg_asset_audit
AFTER INSERT OR UPDATE ON public.hsse_assets
FOR EACH ROW EXECUTE FUNCTION public.log_asset_changes();

-- Add comment for documentation
COMMENT ON FUNCTION public.log_asset_changes() IS 'Automatically logs all asset changes to asset_audit_logs table for compliance and audit trail';