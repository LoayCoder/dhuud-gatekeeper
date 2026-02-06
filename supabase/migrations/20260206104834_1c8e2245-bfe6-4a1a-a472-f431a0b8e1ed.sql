-- Function to notify on public gate pass status changes
-- Uses pg_net to call the edge function when status changes to approved/rejected/acknowledged
CREATE OR REPLACE FUNCTION notify_public_gate_pass_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_tenant_slug TEXT;
  v_supabase_url TEXT;
  v_service_key TEXT;
  v_payload JSONB;
BEGIN
  -- Only process public requests with relevant status changes
  IF NEW.is_public_request = true 
     AND OLD.status IS DISTINCT FROM NEW.status 
     AND NEW.status IN ('approved', 'rejected', 'pending_security_approval') THEN
    
    -- Get tenant slug
    SELECT slug INTO v_tenant_slug FROM tenants WHERE id = NEW.tenant_id;
    
    -- Build the notification URL from environment
    v_supabase_url := current_setting('supabase.url', true);
    v_service_key := current_setting('supabase.service_role_key', true);
    
    -- If settings not available, try the vault
    IF v_supabase_url IS NULL THEN
      SELECT decrypted_secret INTO v_supabase_url 
      FROM vault.decrypted_secrets 
      WHERE name = 'supabase_url'
      LIMIT 1;
    END IF;
    
    -- Build payload
    v_payload := jsonb_build_object(
      'gate_pass_id', NEW.id,
      'tenant_id', NEW.tenant_id,
      'branch_id', NEW.branch_id,
      'reference_number', NEW.reference_number,
      'requester_name', NEW.public_requester_name,
      'requester_phone', NEW.public_requester_phone,
      'requester_email', NEW.public_requester_email,
      'requester_company', NEW.public_requester_company,
      'material_description', NEW.material_description,
      'pass_date', NEW.pass_date::text,
      'tracking_url', '/' || v_tenant_slug || '/track/' || NEW.public_access_token,
      'public_access_token', NEW.public_access_token,
      'event_type', CASE 
        WHEN NEW.status = 'approved' THEN 'approved'
        WHEN NEW.status = 'rejected' THEN 'rejected'
        WHEN NEW.status = 'pending_security_approval' THEN 'acknowledged'
      END,
      'rejection_reason', NEW.rejection_reason
    );
    
    -- Log the status change for debugging
    RAISE NOTICE '[notify_public_gate_pass] Status changed to % for gate pass %, payload: %', 
      NEW.status, NEW.reference_number, v_payload;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trg_notify_public_gate_pass_status ON material_gate_passes;

-- Create trigger
CREATE TRIGGER trg_notify_public_gate_pass_status
  AFTER UPDATE ON material_gate_passes
  FOR EACH ROW
  EXECUTE FUNCTION notify_public_gate_pass_status_change();

-- Add comment for documentation
COMMENT ON FUNCTION notify_public_gate_pass_status_change() IS 
'Logs public gate pass status changes for notification purposes. 
The actual notification is now triggered from the frontend after approval actions.';