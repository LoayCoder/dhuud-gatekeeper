-- ============================================
-- Rate Limiting for Visitor Self-Registration
-- ============================================

-- Step 1: Create rate limit tracking table
CREATE TABLE public.rate_limit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  action_type text NOT NULL,
  tenant_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for efficient lookups
CREATE INDEX idx_rate_limit_log_lookup 
ON rate_limit_log(identifier, action_type, tenant_id, created_at DESC);

-- Index for cleanup queries
CREATE INDEX idx_rate_limit_log_created_at 
ON rate_limit_log(created_at);

-- Enable RLS with insert-only for anon
ALTER TABLE rate_limit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon insert rate limit log"
ON rate_limit_log FOR INSERT TO anon
WITH CHECK (true);

-- Step 2: Create rate limit check function
CREATE OR REPLACE FUNCTION public.check_self_registration_rate_limit(
  _identifier text,
  _tenant_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_count integer;
  max_requests_per_hour integer := 5;
  max_requests_per_day integer := 20;
  max_per_tenant_per_hour integer := 100;
BEGIN
  -- Check 1: Per identifier + tenant (5 per hour)
  SELECT COUNT(*) INTO request_count
  FROM rate_limit_log
  WHERE identifier = _identifier
    AND action_type = 'visitor_self_registration'
    AND tenant_id = _tenant_id
    AND created_at > now() - interval '1 hour';
  
  IF request_count >= max_requests_per_hour THEN
    RETURN false;
  END IF;

  -- Check 2: Per identifier globally (20 per day)
  SELECT COUNT(*) INTO request_count
  FROM rate_limit_log
  WHERE identifier = _identifier
    AND action_type = 'visitor_self_registration'
    AND created_at > now() - interval '24 hours';
  
  IF request_count >= max_requests_per_day THEN
    RETURN false;
  END IF;

  -- Check 3: Per tenant (100 per hour)
  SELECT COUNT(*) INTO request_count
  FROM rate_limit_log
  WHERE action_type = 'visitor_self_registration'
    AND tenant_id = _tenant_id
    AND created_at > now() - interval '1 hour';
  
  IF request_count >= max_per_tenant_per_hour THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

-- Step 3: Create rate limit logging trigger function
CREATE OR REPLACE FUNCTION public.log_self_registration_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  client_ip text;
BEGIN
  -- Get client IP from request headers
  client_ip := COALESCE(
    current_setting('request.headers', true)::json->>'x-forwarded-for',
    current_setting('request.headers', true)::json->>'x-real-ip',
    'unknown'
  );
  
  -- Extract first IP if comma-separated
  IF client_ip LIKE '%,%' THEN
    client_ip := split_part(client_ip, ',', 1);
  END IF;

  -- Log the request
  INSERT INTO rate_limit_log (identifier, action_type, tenant_id)
  VALUES (trim(client_ip), 'visitor_self_registration', NEW.tenant_id);

  RETURN NEW;
END;
$$;

-- Step 4: Create trigger on visitor_self_registrations
CREATE TRIGGER trg_log_self_registration_rate
AFTER INSERT ON visitor_self_registrations
FOR EACH ROW
EXECUTE FUNCTION log_self_registration_rate_limit();

-- Step 5: Update validation function to include rate limit check
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

  -- Check rate limit FIRST
  IF NOT check_self_registration_rate_limit(trim(client_ip), _tenant_id) THEN
    RETURN false;
  END IF;

  -- Original validations
  RETURN (
    EXISTS (
      SELECT 1 FROM tenants 
      WHERE id = _tenant_id 
        AND status = 'active'
    )
    AND _full_name IS NOT NULL AND _full_name <> ''
    AND _phone IS NOT NULL AND _phone <> ''
    AND _company_name IS NOT NULL AND _company_name <> ''
    AND _national_id IS NOT NULL AND _national_id <> ''
    AND _expected_visit_date IS NOT NULL
    AND _expected_visit_date >= CURRENT_DATE
  );
END;
$$;

-- Step 6: Create cleanup function for old rate limit records
CREATE OR REPLACE FUNCTION public.cleanup_rate_limit_log()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM rate_limit_log
  WHERE created_at < now() - interval '7 days';
$$;