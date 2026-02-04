-- ============================================
-- PUBLIC GATE PASS NOTIFICATION TRIGGER
-- Triggers notification when status changes on public gate passes
-- ============================================

-- Function to call notification edge function on status change
CREATE OR REPLACE FUNCTION public.notify_public_gate_pass_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_slug TEXT;
  v_tracking_url TEXT;
  v_event_type TEXT;
BEGIN
  -- Only process public requests
  IF NOT NEW.is_public_request THEN
    RETURN NEW;
  END IF;

  -- Determine event type based on status change
  IF TG_OP = 'INSERT' THEN
    v_event_type := 'submitted';
  ELSIF OLD.status IS DISTINCT FROM NEW.status THEN
    CASE NEW.status
      WHEN 'acknowledged' THEN v_event_type := 'acknowledged';
      WHEN 'approved' THEN v_event_type := 'approved';
      WHEN 'rejected' THEN v_event_type := 'rejected';
      ELSE RETURN NEW; -- No notification for other status changes
    END CASE;
  ELSE
    RETURN NEW; -- No status change, skip notification
  END IF;

  -- Get tenant slug for tracking URL
  SELECT slug INTO v_tenant_slug
  FROM public.tenants
  WHERE id = NEW.tenant_id;

  v_tracking_url := '/' || v_tenant_slug || '/track/' || NEW.public_access_token::TEXT;

  -- Queue notification (using pg_net extension if available, otherwise log)
  -- Note: This requires the pg_net extension to be enabled
  BEGIN
    PERFORM net.http_post(
      url := current_setting('app.supabase_url', true) || '/functions/v1/notify-public-gate-pass',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_key', true)
      ),
      body := jsonb_build_object(
        'gate_pass_id', NEW.id,
        'tenant_id', NEW.tenant_id,
        'branch_id', NEW.branch_id,
        'reference_number', NEW.reference_number,
        'requester_name', NEW.public_requester_name,
        'requester_phone', NEW.public_requester_phone,
        'requester_email', NEW.public_requester_email,
        'requester_company', NEW.public_requester_company,
        'material_description', NEW.material_description,
        'pass_date', NEW.pass_date,
        'tracking_url', v_tracking_url,
        'event_type', v_event_type,
        'rejection_reason', NEW.rejection_reason
      )
    );
  EXCEPTION
    WHEN OTHERS THEN
      -- Log error but don't fail the transaction
      RAISE WARNING 'Failed to send public gate pass notification: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- Create trigger for INSERT
DROP TRIGGER IF EXISTS notify_public_gate_pass_insert ON public.material_gate_passes;
CREATE TRIGGER notify_public_gate_pass_insert
AFTER INSERT ON public.material_gate_passes
FOR EACH ROW
WHEN (NEW.is_public_request = true)
EXECUTE FUNCTION public.notify_public_gate_pass_status_change();

-- Create trigger for UPDATE (status changes)
DROP TRIGGER IF EXISTS notify_public_gate_pass_status ON public.material_gate_passes;
CREATE TRIGGER notify_public_gate_pass_status
AFTER UPDATE OF status ON public.material_gate_passes
FOR EACH ROW
WHEN (NEW.is_public_request = true AND OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.notify_public_gate_pass_status_change();

-- ============================================
-- Add Storage Policy for Public Photo Uploads
-- ============================================

-- Note: This needs to be run in Supabase Dashboard as storage policies
-- are managed separately. The SQL below is for reference:
--
-- Policy name: Allow public uploads to gate-pass-photos/public folder
-- Operation: INSERT
-- Target role: anon
-- WITH CHECK: bucket_id = 'gate-pass-photos' AND (storage.foldername(name))[1] = 'public'

-- ============================================
-- Create helper function for public gate pass approval by staff
-- ============================================

CREATE OR REPLACE FUNCTION public.approve_public_gate_pass(
  p_user_id UUID,
  p_gate_pass_id UUID,
  p_action TEXT,  -- 'acknowledge', 'approve', 'reject'
  p_notes TEXT DEFAULT NULL,
  p_rejection_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gate_pass RECORD;
  v_user_role TEXT;
  v_has_permission BOOLEAN := false;
  v_new_status TEXT;
BEGIN
  -- Get gate pass
  SELECT * INTO v_gate_pass
  FROM public.material_gate_passes
  WHERE id = p_gate_pass_id
    AND is_public_request = true
    AND deleted_at IS NULL;

  IF v_gate_pass IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Gate pass not found');
  END IF;

  -- Check user has golf_club_mgmt role
  SELECT role INTO v_user_role
  FROM public.user_roles
  WHERE user_id = p_user_id
    AND role = 'golf_club_mgmt';

  IF v_user_role IS NOT NULL THEN
    v_has_permission := true;
  END IF;

  -- Also check for admin
  IF NOT v_has_permission THEN
    SELECT role INTO v_user_role
    FROM public.user_roles
    WHERE user_id = p_user_id
      AND role IN ('admin', 'tenant_admin', 'super_admin');

    IF v_user_role IS NOT NULL THEN
      v_has_permission := true;
    END IF;
  END IF;

  IF NOT v_has_permission THEN
    RETURN jsonb_build_object('success', false, 'error', 'You do not have permission to process this gate pass');
  END IF;

  -- Process action
  CASE p_action
    WHEN 'acknowledge' THEN
      IF v_gate_pass.status != 'pending_mgmt' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Gate pass is not pending acknowledgment');
      END IF;
      v_new_status := 'acknowledged';

      UPDATE public.material_gate_passes
      SET status = v_new_status,
          club_mgmt_ack_by = p_user_id,
          club_mgmt_ack_at = NOW(),
          pm_notes = COALESCE(pm_notes || E'\n', '') || COALESCE(p_notes, '')
      WHERE id = p_gate_pass_id;

    WHEN 'approve' THEN
      IF v_gate_pass.status NOT IN ('pending_mgmt', 'acknowledged') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Gate pass cannot be approved in current state');
      END IF;
      v_new_status := 'approved';

      UPDATE public.material_gate_passes
      SET status = v_new_status,
          pm_approved_by = p_user_id,
          pm_approved_at = NOW(),
          safety_approved_by = p_user_id, -- Auto-approve safety for public passes
          safety_approved_at = NOW(),
          pm_notes = COALESCE(pm_notes || E'\n', '') || COALESCE(p_notes, '')
      WHERE id = p_gate_pass_id;

    WHEN 'reject' THEN
      IF v_gate_pass.status IN ('rejected', 'cancelled', 'used', 'expired') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Gate pass cannot be rejected in current state');
      END IF;
      v_new_status := 'rejected';

      UPDATE public.material_gate_passes
      SET status = v_new_status,
          rejected_by = p_user_id,
          rejected_at = NOW(),
          rejection_reason = p_rejection_reason
      WHERE id = p_gate_pass_id;

    ELSE
      RETURN jsonb_build_object('success', false, 'error', 'Invalid action');
  END CASE;

  RETURN jsonb_build_object(
    'success', true,
    'new_status', v_new_status,
    'gate_pass_id', p_gate_pass_id
  );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.approve_public_gate_pass TO authenticated;

-- ============================================
-- Add missing columns if they don't exist
-- ============================================

ALTER TABLE public.material_gate_passes
ADD COLUMN IF NOT EXISTS club_mgmt_ack_by UUID REFERENCES public.profiles(id);

ALTER TABLE public.material_gate_passes
ADD COLUMN IF NOT EXISTS club_mgmt_ack_at TIMESTAMPTZ;
