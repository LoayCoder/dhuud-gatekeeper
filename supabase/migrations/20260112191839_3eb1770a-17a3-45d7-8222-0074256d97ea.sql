-- =====================================================
-- SECURITY FIX: Resolve Critical RLS Vulnerabilities
-- =====================================================

-- ======= FIX 1: login_history - Replace permissive INSERT =======
DROP POLICY IF EXISTS "Service role can insert login history" ON public.login_history;

-- Create SECURITY DEFINER function for edge functions to insert login history
CREATE OR REPLACE FUNCTION public.log_login_attempt(
  p_user_id uuid,
  p_tenant_id uuid,
  p_email text DEFAULT NULL,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_login_success boolean DEFAULT true,
  p_failure_reason text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO login_history (
    user_id, tenant_id, email, ip_address, 
    user_agent, login_success, failure_reason
  )
  VALUES (
    p_user_id, p_tenant_id, p_email, p_ip_address,
    p_user_agent, p_login_success, p_failure_reason
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- ======= FIX 2: email_delivery_logs - Replace permissive policies =======
DROP POLICY IF EXISTS "Service role can insert email logs" ON public.email_delivery_logs;
DROP POLICY IF EXISTS "Service role can update email logs" ON public.email_delivery_logs;

-- Create SECURITY DEFINER function for email logging
CREATE OR REPLACE FUNCTION public.log_email_delivery(
  p_tenant_id uuid,
  p_function_name text,
  p_email_type text,
  p_recipient_email text,
  p_recipient_name text DEFAULT NULL,
  p_subject text DEFAULT NULL,
  p_status text DEFAULT 'pending',
  p_provider_message_id text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO email_delivery_logs (
    tenant_id, function_name, email_type, recipient_email, 
    recipient_name, subject, status, provider_message_id
  )
  VALUES (
    p_tenant_id, p_function_name, p_email_type, p_recipient_email,
    p_recipient_name, p_subject, p_status, p_provider_message_id
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_email_status(
  p_message_id text,
  p_status text,
  p_error_message text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE email_delivery_logs
  SET 
    status = p_status,
    last_error = p_error_message,
    updated_at = now()
  WHERE provider_message_id = p_message_id;
END;
$$;

-- ======= FIX 3: webauthn_challenges - Replace permissive ALL =======
DROP POLICY IF EXISTS "Service role can manage challenges" ON public.webauthn_challenges;

-- Users can only manage their own challenges
CREATE POLICY "Users can manage own challenges" ON public.webauthn_challenges
FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Cleanup function for expired challenges
CREATE OR REPLACE FUNCTION public.cleanup_expired_webauthn_challenges()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  DELETE FROM webauthn_challenges WHERE expires_at < now();
END;
$$;

-- ======= FIX 4: investigation_sla_configs - Replace permissive ALL =======
DROP POLICY IF EXISTS "Allow admins to manage investigation SLA configs" ON public.investigation_sla_configs;

-- Only admins can modify SLA configs (this is a global table without tenant_id)
CREATE POLICY "Admins can manage SLA configs" ON public.investigation_sla_configs
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ======= FIX 5: hsse_event_categories/subtypes - Restrict INSERT to admins =======
DROP POLICY IF EXISTS "Authenticated users can insert event categories" ON public.hsse_event_categories;
DROP POLICY IF EXISTS "Authenticated users can insert event subtypes" ON public.hsse_event_subtypes;

CREATE POLICY "Admins can insert event categories" ON public.hsse_event_categories
FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert event subtypes" ON public.hsse_event_subtypes
FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ======= FIX 6: notifications - Replace permissive INSERT =======
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

-- Create SECURITY DEFINER function for notification insertion
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id uuid,
  p_tenant_id uuid,
  p_title text,
  p_message text,
  p_type text DEFAULT 'info',
  p_link text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_notification_id uuid;
BEGIN
  INSERT INTO notifications (user_id, tenant_id, title, message, type, link)
  VALUES (p_user_id, p_tenant_id, p_title, p_message, p_type, p_link)
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$;

-- ======= FIX 7: mfa_backup_codes - Replace permissive policies =======
DROP POLICY IF EXISTS "Service role can insert backup codes" ON public.mfa_backup_codes;
DROP POLICY IF EXISTS "Service role can update backup codes" ON public.mfa_backup_codes;

-- Create SECURITY DEFINER functions for MFA backup code management
CREATE OR REPLACE FUNCTION public.store_mfa_backup_codes(
  p_user_id uuid,
  p_codes text[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Delete existing codes for user
  DELETE FROM mfa_backup_codes WHERE user_id = p_user_id;
  
  -- Insert new codes
  INSERT INTO mfa_backup_codes (user_id, code_hash, is_used)
  SELECT p_user_id, unnest(p_codes), false;
END;
$$;

CREATE OR REPLACE FUNCTION public.use_mfa_backup_code(
  p_user_id uuid,
  p_code_hash text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_found boolean;
BEGIN
  UPDATE mfa_backup_codes
  SET is_used = true, used_at = now()
  WHERE user_id = p_user_id 
    AND code_hash = p_code_hash 
    AND is_used = false
  RETURNING true INTO v_found;
  
  RETURN COALESCE(v_found, false);
END;
$$;

-- ======= FIX 8: push_subscriptions - Replace permissive UPDATE =======
DROP POLICY IF EXISTS "Service role can update subscriptions" ON public.push_subscriptions;

CREATE OR REPLACE FUNCTION public.update_push_subscription(
  p_user_id uuid,
  p_endpoint text,
  p_is_active boolean DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE push_subscriptions
  SET is_active = p_is_active, updated_at = now()
  WHERE user_id = p_user_id AND endpoint = p_endpoint;
END;
$$;