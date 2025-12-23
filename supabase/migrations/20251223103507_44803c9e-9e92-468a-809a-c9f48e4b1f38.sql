-- =====================================================
-- ADVANCED SECURITY FEATURES MIGRATION
-- 1. Session tracking for concurrent session limits
-- 2. IP geolocation for country-based detection
-- 3. Security dashboard support tables
-- =====================================================

-- =====================================================
-- PART 1: Active Sessions Tracking Table
-- Track all active user sessions for concurrent session limits
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE, -- Hash of the JWT or session identifier
  device_info JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  ip_country TEXT,
  ip_city TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  invalidated_at TIMESTAMPTZ,
  invalidation_reason TEXT,
  invalidated_by UUID REFERENCES public.profiles(id)
);

-- Enable RLS
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own sessions"
ON public.user_sessions FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own sessions"
ON public.user_sessions FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "System can insert sessions"
ON public.user_sessions FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all sessions in tenant"
ON public.user_sessions FOR SELECT
TO authenticated
USING (
  tenant_id = get_auth_tenant_id() 
  AND is_admin(auth.uid())
);

CREATE POLICY "Admins can update sessions in tenant"
ON public.user_sessions FOR UPDATE
TO authenticated
USING (
  tenant_id = get_auth_tenant_id() 
  AND is_admin(auth.uid())
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_sessions_tenant_id ON public.user_sessions(tenant_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON public.user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_activity ON public.user_sessions(last_activity_at);

-- =====================================================
-- PART 2: Tenant Security Settings
-- Add concurrent session limit setting to tenants
-- =====================================================

ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS max_concurrent_sessions INTEGER DEFAULT 1
CHECK (max_concurrent_sessions >= 1 AND max_concurrent_sessions <= 10);

ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS enforce_ip_country_check BOOLEAN DEFAULT true;

ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS security_scan_enabled BOOLEAN DEFAULT true;

ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS last_security_scan_at TIMESTAMPTZ;

COMMENT ON COLUMN public.tenants.max_concurrent_sessions IS 'Maximum number of concurrent sessions per user (1-10). Default is 1 (single session).';
COMMENT ON COLUMN public.tenants.enforce_ip_country_check IS 'If true, invalidate sessions when IP country changes.';

-- =====================================================
-- PART 3: Security Scan Results Table
-- Store automated security scan findings
-- =====================================================

CREATE TABLE IF NOT EXISTS public.security_scan_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  scan_type TEXT NOT NULL, -- 'vulnerability', 'compliance', 'configuration', 'access'
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
  category TEXT NOT NULL, -- 'rls', 'authentication', 'data_exposure', 'configuration', etc.
  title TEXT NOT NULL,
  description TEXT,
  affected_resource TEXT, -- table name, function name, etc.
  recommendation TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved', 'false_positive')),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.profiles(id),
  resolution_notes TEXT,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  scan_run_id UUID, -- Group findings from same scan
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.security_scan_results ENABLE ROW LEVEL SECURITY;

-- Only admins can view/manage security scan results
CREATE POLICY "Admins can view security scan results"
ON public.security_scan_results FOR SELECT
TO authenticated
USING (
  tenant_id = get_auth_tenant_id() 
  AND is_admin(auth.uid())
);

CREATE POLICY "Admins can update security scan results"
ON public.security_scan_results FOR UPDATE
TO authenticated
USING (
  tenant_id = get_auth_tenant_id() 
  AND is_admin(auth.uid())
);

CREATE POLICY "System can insert security scan results"
ON public.security_scan_results FOR INSERT
TO authenticated
WITH CHECK (tenant_id = get_auth_tenant_id());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_security_scan_results_tenant ON public.security_scan_results(tenant_id);
CREATE INDEX IF NOT EXISTS idx_security_scan_results_status ON public.security_scan_results(status) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_security_scan_results_severity ON public.security_scan_results(severity);

-- =====================================================
-- PART 4: Function to Invalidate Other Sessions
-- Used when single-session policy is enforced
-- =====================================================

CREATE OR REPLACE FUNCTION invalidate_other_user_sessions(
  p_user_id UUID,
  p_current_session_token TEXT,
  p_reason TEXT DEFAULT 'new_login'
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invalidated_count INTEGER;
BEGIN
  UPDATE public.user_sessions
  SET 
    is_active = false,
    invalidated_at = now(),
    invalidation_reason = p_reason
  WHERE user_id = p_user_id
    AND session_token != p_current_session_token
    AND is_active = true;
  
  GET DIAGNOSTICS v_invalidated_count = ROW_COUNT;
  
  -- Log to security audit
  IF v_invalidated_count > 0 THEN
    INSERT INTO public.security_audit_logs (
      tenant_id,
      actor_id,
      action,
      table_name,
      new_value,
      created_at
    ) VALUES (
      get_auth_tenant_id(),
      p_user_id,
      'sessions_invalidated',
      'user_sessions',
      jsonb_build_object(
        'invalidated_count', v_invalidated_count,
        'reason', p_reason,
        'current_session', p_current_session_token
      ),
      now()
    );
  END IF;
  
  RETURN v_invalidated_count;
END;
$$;

-- =====================================================
-- PART 5: Function to Check Session Validity
-- Validates session and checks for IP country changes
-- =====================================================

CREATE OR REPLACE FUNCTION validate_user_session(
  p_session_token TEXT,
  p_current_ip TEXT,
  p_current_country TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session RECORD;
  v_tenant RECORD;
  v_should_invalidate BOOLEAN := false;
  v_invalidation_reason TEXT;
BEGIN
  -- Get session details
  SELECT * INTO v_session
  FROM public.user_sessions
  WHERE session_token = p_session_token
    AND is_active = true;
  
  IF v_session IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'session_not_found');
  END IF;
  
  -- Check if session expired
  IF v_session.expires_at IS NOT NULL AND v_session.expires_at < now() THEN
    UPDATE public.user_sessions
    SET is_active = false, invalidated_at = now(), invalidation_reason = 'expired'
    WHERE id = v_session.id;
    RETURN jsonb_build_object('valid', false, 'reason', 'session_expired');
  END IF;
  
  -- Get tenant security settings
  SELECT * INTO v_tenant
  FROM public.tenants
  WHERE id = v_session.tenant_id;
  
  -- Check for country change if enforcement is enabled
  IF v_tenant.enforce_ip_country_check 
     AND p_current_country IS NOT NULL 
     AND v_session.ip_country IS NOT NULL
     AND v_session.ip_country != p_current_country THEN
    v_should_invalidate := true;
    v_invalidation_reason := 'ip_country_changed';
  END IF;
  
  IF v_should_invalidate THEN
    -- Invalidate session
    UPDATE public.user_sessions
    SET 
      is_active = false, 
      invalidated_at = now(), 
      invalidation_reason = v_invalidation_reason
    WHERE id = v_session.id;
    
    -- Log security event
    INSERT INTO public.security_audit_logs (
      tenant_id,
      actor_id,
      action,
      table_name,
      old_value,
      new_value,
      created_at
    ) VALUES (
      v_session.tenant_id,
      v_session.user_id,
      'session_invalidated_ip_change',
      'user_sessions',
      jsonb_build_object('ip_country', v_session.ip_country, 'ip_address', v_session.ip_address),
      jsonb_build_object('ip_country', p_current_country, 'ip_address', p_current_ip),
      now()
    );
    
    RETURN jsonb_build_object(
      'valid', false, 
      'reason', v_invalidation_reason,
      'original_country', v_session.ip_country,
      'current_country', p_current_country
    );
  END IF;
  
  -- Update last activity
  UPDATE public.user_sessions
  SET 
    last_activity_at = now(),
    ip_address = COALESCE(p_current_ip, ip_address),
    ip_country = COALESCE(p_current_country, ip_country)
  WHERE id = v_session.id;
  
  RETURN jsonb_build_object('valid', true, 'session_id', v_session.id);
END;
$$;

-- =====================================================
-- PART 6: Function to Get Active Session Count
-- For checking concurrent session limits
-- =====================================================

CREATE OR REPLACE FUNCTION get_user_active_session_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.user_sessions
  WHERE user_id = p_user_id
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now());
$$;

-- =====================================================
-- PART 7: Function to Get Security Dashboard Stats
-- Aggregates security data for admin dashboard
-- =====================================================

CREATE OR REPLACE FUNCTION get_security_dashboard_stats()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_result JSONB;
BEGIN
  v_tenant_id := get_auth_tenant_id();
  
  -- Check admin access
  IF NOT is_admin(auth.uid()) THEN
    RETURN jsonb_build_object('error', 'Access denied');
  END IF;
  
  SELECT jsonb_build_object(
    -- Active sessions
    'active_sessions', (
      SELECT COUNT(*) FROM public.user_sessions 
      WHERE tenant_id = v_tenant_id AND is_active = true
    ),
    -- Unique users with active sessions
    'users_with_sessions', (
      SELECT COUNT(DISTINCT user_id) FROM public.user_sessions 
      WHERE tenant_id = v_tenant_id AND is_active = true
    ),
    -- Sessions invalidated in last 24h
    'sessions_invalidated_24h', (
      SELECT COUNT(*) FROM public.user_sessions 
      WHERE tenant_id = v_tenant_id 
        AND invalidated_at > now() - interval '24 hours'
    ),
    -- Suspicious login attempts (last 7 days)
    'suspicious_logins_7d', (
      SELECT COUNT(*) FROM public.login_history 
      WHERE tenant_id = v_tenant_id 
        AND is_suspicious = true 
        AND created_at > now() - interval '7 days'
    ),
    -- Failed logins (last 24h)
    'failed_logins_24h', (
      SELECT COUNT(*) FROM public.login_history 
      WHERE tenant_id = v_tenant_id 
        AND login_successful = false 
        AND created_at > now() - interval '24 hours'
    ),
    -- Security scan findings by severity
    'scan_findings', (
      SELECT COALESCE(jsonb_object_agg(severity, cnt), '{}'::jsonb)
      FROM (
        SELECT severity, COUNT(*) as cnt 
        FROM public.security_scan_results 
        WHERE tenant_id = v_tenant_id AND status = 'open'
        GROUP BY severity
      ) sub
    ),
    -- Recent security events
    'recent_events', (
      SELECT COALESCE(jsonb_agg(e ORDER BY created_at DESC), '[]'::jsonb)
      FROM (
        SELECT 
          action,
          created_at,
          actor_id,
          new_value
        FROM public.security_audit_logs
        WHERE tenant_id = v_tenant_id
        ORDER BY created_at DESC
        LIMIT 10
      ) e
    ),
    -- MFA adoption rate
    'mfa_enabled_users', (
      SELECT COUNT(*) FROM public.profiles 
      WHERE tenant_id = v_tenant_id AND mfa_enabled = true
    ),
    'total_users', (
      SELECT COUNT(*) FROM public.profiles 
      WHERE tenant_id = v_tenant_id AND is_active = true
    )
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;