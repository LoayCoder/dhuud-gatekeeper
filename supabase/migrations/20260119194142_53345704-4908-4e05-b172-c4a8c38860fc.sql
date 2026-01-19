-- Create IP whitelist table for bypassing rate limits
CREATE TABLE public.ip_whitelist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL,
  reason text NOT NULL,
  added_by uuid REFERENCES auth.users(id),
  tenant_id uuid REFERENCES tenants(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  notes text,
  CONSTRAINT ip_whitelist_unique_active UNIQUE (ip_address, tenant_id)
);

-- Indexes
CREATE INDEX idx_ip_whitelist_lookup ON ip_whitelist(ip_address) WHERE is_active = true;
CREATE INDEX idx_ip_whitelist_tenant ON ip_whitelist(tenant_id) WHERE is_active = true;

-- RLS: Admins only
ALTER TABLE ip_whitelist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage ip_whitelist"
ON ip_whitelist FOR ALL TO authenticated
USING (is_admin(auth.uid()));

-- Update validation function to check whitelist first
CREATE OR REPLACE FUNCTION public.validate_visitor_self_registration(
  _tenant_id uuid,
  _full_name text,
  _phone text,
  _company_name text,
  _national_id text,
  _expected_visit_date date
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  client_ip text;
  is_whitelisted boolean;
  validation_failed boolean := false;
  failure_reason text;
BEGIN
  -- Get client IP
  client_ip := COALESCE(
    current_setting('request.headers', true)::json->>'x-forwarded-for',
    current_setting('request.headers', true)::json->>'x-real-ip',
    'unknown'
  );
  
  IF client_ip LIKE '%,%' THEN
    client_ip := split_part(client_ip, ',', 1);
  END IF;
  client_ip := trim(client_ip);

  -- Check whitelist FIRST (bypass blocking for whitelisted IPs)
  SELECT EXISTS (
    SELECT 1 FROM ip_whitelist 
    WHERE ip_address = client_ip 
      AND is_active = true 
      AND (expires_at IS NULL OR expires_at > now())
      AND (tenant_id IS NULL OR tenant_id = _tenant_id)
  ) INTO is_whitelisted;

  -- If not whitelisted, check blocklist
  IF NOT is_whitelisted THEN
    IF is_ip_blocked(client_ip) THEN
      PERFORM log_failed_registration_attempt(client_ip, _tenant_id, 'ip_blocked');
      RETURN false;
    END IF;

    -- Check rate limit
    IF NOT check_self_registration_rate_limit(client_ip, _tenant_id) THEN
      PERFORM log_failed_registration_attempt(client_ip, _tenant_id, 'rate_limit_exceeded');
      RETURN false;
    END IF;
  END IF;

  -- Check tenant validation
  IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = _tenant_id AND status = 'active') THEN
    PERFORM log_failed_registration_attempt(client_ip, _tenant_id, 'invalid_tenant');
    RETURN false;
  END IF;

  -- Check required fields
  IF _full_name IS NULL OR _full_name = '' THEN
    failure_reason := 'missing_full_name';
    validation_failed := true;
  ELSIF _phone IS NULL OR _phone = '' THEN
    failure_reason := 'missing_phone';
    validation_failed := true;
  ELSIF _company_name IS NULL OR _company_name = '' THEN
    failure_reason := 'missing_company_name';
    validation_failed := true;
  ELSIF _national_id IS NULL OR _national_id = '' THEN
    failure_reason := 'missing_national_id';
    validation_failed := true;
  ELSIF _expected_visit_date IS NULL THEN
    failure_reason := 'missing_visit_date';
    validation_failed := true;
  ELSIF _expected_visit_date < CURRENT_DATE THEN
    failure_reason := 'past_visit_date';
    validation_failed := true;
  END IF;

  IF validation_failed THEN
    PERFORM log_failed_registration_attempt(client_ip, _tenant_id, failure_reason);
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

-- RPC function to get rate limit statistics (admin only)
CREATE OR REPLACE FUNCTION public.get_rate_limit_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stats jsonb;
BEGIN
  -- Only admins can view stats
  IF NOT is_admin(auth.uid()) THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'total_requests_24h', (
      SELECT COUNT(*) FROM rate_limit_log 
      WHERE created_at > now() - interval '24 hours'
    ),
    'failed_requests_24h', (
      SELECT COUNT(*) FROM rate_limit_log 
      WHERE created_at > now() - interval '24 hours'
        AND success = false
    ),
    'blocked_requests_24h', (
      SELECT COUNT(*) FROM rate_limit_log 
      WHERE created_at > now() - interval '24 hours'
        AND failure_reason = 'ip_blocked'
    ),
    'active_blocks_temporary', (
      SELECT COUNT(*) FROM ip_blocklist 
      WHERE block_type = 'temporary' 
        AND (expires_at IS NULL OR expires_at > now())
    ),
    'active_blocks_permanent', (
      SELECT COUNT(*) FROM ip_blocklist 
      WHERE block_type = 'permanent'
    ),
    'whitelisted_ips', (
      SELECT COUNT(*) FROM ip_whitelist 
      WHERE is_active = true
        AND (expires_at IS NULL OR expires_at > now())
    ),
    'threats_detected_24h', (
      SELECT COUNT(*) FROM suspicious_activity_log
      WHERE detected_at > now() - interval '24 hours'
    )
  ) INTO stats;

  RETURN stats;
END;
$$;

-- RPC function to manually block an IP (admin only)
CREATE OR REPLACE FUNCTION public.admin_block_ip(
  _ip_address text,
  _block_type text,
  _reason text,
  _duration_hours integer DEFAULT NULL,
  _tenant_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
  expires timestamptz;
BEGIN
  -- Only admins can block IPs
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Calculate expiration
  IF _block_type = 'permanent' THEN
    expires := NULL;
  ELSE
    expires := now() + (_duration_hours * interval '1 hour');
  END IF;

  -- Insert or update block
  INSERT INTO ip_blocklist (ip_address, block_type, reason, expires_at, blocked_by, tenant_id)
  VALUES (_ip_address, _block_type, _reason, expires, auth.uid()::text, _tenant_id)
  ON CONFLICT (ip_address) 
  DO UPDATE SET
    block_type = EXCLUDED.block_type,
    reason = EXCLUDED.reason,
    expires_at = EXCLUDED.expires_at,
    blocked_by = EXCLUDED.blocked_by
  RETURNING id INTO new_id;

  -- Log to suspicious activity
  INSERT INTO suspicious_activity_log (ip_address, activity_type, severity, details, tenant_id, action_taken)
  VALUES (
    _ip_address,
    'manual_block',
    CASE WHEN _block_type = 'permanent' THEN 'critical' ELSE 'high' END,
    jsonb_build_object(
      'block_type', _block_type,
      'reason', _reason,
      'blocked_by', auth.uid(),
      'duration_hours', _duration_hours
    ),
    _tenant_id,
    CASE WHEN _block_type = 'permanent' THEN 'perm_blocked' ELSE 'temp_blocked' END
  );

  RETURN new_id;
END;
$$;

-- RPC function to whitelist an IP (admin only)
CREATE OR REPLACE FUNCTION public.admin_whitelist_ip(
  _ip_address text,
  _reason text,
  _duration_hours integer DEFAULT NULL,
  _tenant_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
  expires timestamptz;
BEGIN
  -- Only admins can whitelist IPs
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Calculate expiration
  IF _duration_hours IS NULL THEN
    expires := NULL;
  ELSE
    expires := now() + (_duration_hours * interval '1 hour');
  END IF;

  -- Remove from blocklist first
  DELETE FROM ip_blocklist WHERE ip_address = _ip_address;

  -- Insert whitelist entry
  INSERT INTO ip_whitelist (ip_address, reason, added_by, expires_at, tenant_id)
  VALUES (_ip_address, _reason, auth.uid(), expires, _tenant_id)
  ON CONFLICT (ip_address, tenant_id) 
  DO UPDATE SET
    reason = EXCLUDED.reason,
    expires_at = EXCLUDED.expires_at,
    is_active = true
  RETURNING id INTO new_id;

  -- Log activity
  INSERT INTO suspicious_activity_log (ip_address, activity_type, severity, details, tenant_id, action_taken)
  VALUES (
    _ip_address,
    'whitelisted',
    'low',
    jsonb_build_object(
      'reason', _reason,
      'added_by', auth.uid(),
      'duration_hours', _duration_hours
    ),
    _tenant_id,
    'whitelisted'
  );

  RETURN new_id;
END;
$$;

-- RPC function to remove IP from blocklist (admin only)
CREATE OR REPLACE FUNCTION public.admin_unblock_ip(_ip_address text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins can unblock IPs
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  DELETE FROM ip_blocklist WHERE ip_address = _ip_address;

  -- Log activity
  INSERT INTO suspicious_activity_log (ip_address, activity_type, severity, details, action_taken)
  VALUES (
    _ip_address,
    'unblocked',
    'low',
    jsonb_build_object('unblocked_by', auth.uid()),
    'unblocked'
  );

  RETURN true;
END;
$$;