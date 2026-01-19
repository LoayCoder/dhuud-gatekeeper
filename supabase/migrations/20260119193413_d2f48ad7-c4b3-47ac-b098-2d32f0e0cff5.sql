-- =============================================
-- IP-Based Blocking & Suspicious Activity Detection
-- =============================================

-- 1. Create IP Blocklist Table
CREATE TABLE public.ip_blocklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL,
  block_type text NOT NULL DEFAULT 'temporary', -- 'temporary', 'permanent'
  reason text NOT NULL,
  blocked_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz, -- NULL for permanent blocks
  blocked_by text DEFAULT 'system', -- 'system' or user_id
  failed_attempts integer DEFAULT 0,
  last_attempt_at timestamptz,
  tenant_id uuid REFERENCES tenants(id), -- NULL for global blocks
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for efficient lookups
CREATE INDEX idx_ip_blocklist_lookup ON ip_blocklist(ip_address, expires_at);
CREATE INDEX idx_ip_blocklist_ip ON ip_blocklist(ip_address);

-- 2. Create Suspicious Activity Log Table
CREATE TABLE public.suspicious_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL,
  activity_type text NOT NULL, -- 'rate_limit_exceeded', 'invalid_tenant', 'missing_fields', 'auto_blocked'
  severity text NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  details jsonb DEFAULT '{}',
  tenant_id uuid REFERENCES tenants(id),
  detected_at timestamptz NOT NULL DEFAULT now(),
  action_taken text, -- 'logged', 'temp_blocked', 'perm_blocked'
  resolved_at timestamptz,
  resolved_by uuid REFERENCES profiles(id)
);

CREATE INDEX idx_suspicious_activity_ip ON suspicious_activity_log(ip_address, detected_at DESC);
CREATE INDEX idx_suspicious_activity_tenant ON suspicious_activity_log(tenant_id, detected_at DESC);

-- 3. Extend Rate Limit Log Table with success/failure tracking
ALTER TABLE rate_limit_log 
ADD COLUMN IF NOT EXISTS success boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS failure_reason text;

-- 4. Check IP Blocklist Function
CREATE OR REPLACE FUNCTION public.is_ip_blocked(_ip_address text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM ip_blocklist
    WHERE ip_address = _ip_address
      AND (expires_at IS NULL OR expires_at > now())
  )
$$;

-- 5. Auto-Block IP Function
CREATE OR REPLACE FUNCTION public.auto_block_ip(
  _ip_address text,
  _block_type text,
  _reason text,
  _failed_attempts integer,
  _tenant_id uuid,
  _duration interval DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_block uuid;
  severity text;
BEGIN
  -- Check if already blocked
  SELECT id INTO existing_block
  FROM ip_blocklist
  WHERE ip_address = _ip_address
    AND (expires_at IS NULL OR expires_at > now());

  IF existing_block IS NOT NULL THEN
    -- Update existing block with new info
    UPDATE ip_blocklist
    SET failed_attempts = _failed_attempts,
        last_attempt_at = now(),
        reason = _reason,
        block_type = CASE WHEN _block_type = 'permanent' THEN 'permanent' ELSE block_type END,
        expires_at = CASE WHEN _block_type = 'permanent' THEN NULL ELSE GREATEST(expires_at, now() + _duration) END
    WHERE id = existing_block;
  ELSE
    -- Create new block
    INSERT INTO ip_blocklist (ip_address, block_type, reason, expires_at, failed_attempts, last_attempt_at, tenant_id)
    VALUES (
      _ip_address, 
      _block_type, 
      _reason, 
      CASE WHEN _block_type = 'permanent' THEN NULL ELSE now() + _duration END,
      _failed_attempts,
      now(),
      _tenant_id
    );
  END IF;

  -- Determine severity
  severity := CASE 
    WHEN _block_type = 'permanent' THEN 'critical'
    WHEN _failed_attempts >= 25 THEN 'high'
    WHEN _failed_attempts >= 10 THEN 'medium'
    ELSE 'low'
  END;

  -- Log to suspicious activity
  INSERT INTO suspicious_activity_log (ip_address, activity_type, severity, details, tenant_id, action_taken)
  VALUES (
    _ip_address,
    'auto_blocked',
    severity,
    jsonb_build_object(
      'block_type', _block_type,
      'failed_attempts', _failed_attempts,
      'reason', _reason,
      'duration', _duration::text
    ),
    _tenant_id,
    CASE WHEN _block_type = 'permanent' THEN 'perm_blocked' ELSE 'temp_blocked' END
  );
END;
$$;

-- 6. Log Failed Registration Attempt Function
CREATE OR REPLACE FUNCTION public.log_failed_registration_attempt(
  _ip_address text,
  _tenant_id uuid,
  _failure_reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  failed_count integer;
  threshold_temp_block integer := 10;  -- 10 failures = 1hr temp block
  threshold_long_block integer := 25;  -- 25 failures = 24hr block
  threshold_perm_block integer := 50;  -- 50 failures = permanent block
BEGIN
  -- Log the failed attempt
  INSERT INTO rate_limit_log (identifier, action_type, tenant_id, success, failure_reason)
  VALUES (_ip_address, 'visitor_self_registration', _tenant_id, false, _failure_reason);

  -- Count recent failures from this IP (last 24 hours)
  SELECT COUNT(*) INTO failed_count
  FROM rate_limit_log
  WHERE identifier = _ip_address
    AND success = false
    AND created_at > now() - interval '24 hours';

  -- Auto-block based on failure thresholds
  IF failed_count >= threshold_perm_block THEN
    -- Permanent block
    PERFORM auto_block_ip(_ip_address, 'permanent', 
      format('Exceeded %s failed attempts in 24 hours', failed_count),
      failed_count, _tenant_id);
      
  ELSIF failed_count >= threshold_long_block THEN
    -- 24-hour block
    PERFORM auto_block_ip(_ip_address, 'temporary', 
      format('Exceeded %s failed attempts - 24hr block', failed_count),
      failed_count, _tenant_id, interval '24 hours');
      
  ELSIF failed_count >= threshold_temp_block THEN
    -- 1-hour block
    PERFORM auto_block_ip(_ip_address, 'temporary', 
      format('Exceeded %s failed attempts - 1hr block', failed_count),
      failed_count, _tenant_id, interval '1 hour');
  END IF;
END;
$$;

-- 7. Updated Validation Function with Blocklist Check
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

  -- Check 1: Is IP blocked?
  IF is_ip_blocked(client_ip) THEN
    PERFORM log_failed_registration_attempt(client_ip, _tenant_id, 'ip_blocked');
    RETURN false;
  END IF;

  -- Check 2: Rate limit
  IF NOT check_self_registration_rate_limit(client_ip, _tenant_id) THEN
    PERFORM log_failed_registration_attempt(client_ip, _tenant_id, 'rate_limit_exceeded');
    RETURN false;
  END IF;

  -- Check 3: Tenant validation
  IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = _tenant_id AND status = 'active') THEN
    PERFORM log_failed_registration_attempt(client_ip, _tenant_id, 'invalid_tenant');
    RETURN false;
  END IF;

  -- Check 4: Required fields validation
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

-- 8. Cleanup Expired Blocks Function
CREATE OR REPLACE FUNCTION public.cleanup_expired_ip_blocks()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  WITH deleted AS (
    DELETE FROM ip_blocklist
    WHERE expires_at IS NOT NULL 
      AND expires_at < now()
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  
  RETURN deleted_count;
END;
$$;

-- 9. RLS Policies for IP Blocklist (using existing is_admin function)
ALTER TABLE ip_blocklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage ip_blocklist"
ON ip_blocklist FOR ALL TO authenticated
USING (is_admin(auth.uid()));

-- 10. RLS Policies for Suspicious Activity Log (using existing is_admin function)
ALTER TABLE suspicious_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view suspicious_activity_log"
ON suspicious_activity_log FOR SELECT TO authenticated
USING (is_admin(auth.uid()));