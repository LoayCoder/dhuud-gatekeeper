-- Fix function search_path for security
CREATE OR REPLACE FUNCTION check_visitor_blacklist(
  _national_id text,
  _company_name text,
  _tenant_id uuid
) RETURNS TABLE (
  is_blacklisted boolean,
  blacklist_reason text,
  blacklist_type text
) 
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    true AS is_blacklisted,
    sb.reason AS blacklist_reason,
    sb.blacklist_type
  FROM security_blacklist sb
  WHERE sb.tenant_id = _tenant_id
    AND sb.deleted_at IS NULL
    AND (sb.expiry_date IS NULL OR sb.expiry_date > CURRENT_DATE)
    AND (
      (sb.national_id IS NOT NULL AND sb.national_id = _national_id)
      OR (sb.company_name IS NOT NULL AND _company_name ILIKE '%' || sb.company_name || '%')
    )
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, null::text, null::text;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION validate_visitor_access(
  _qr_token uuid,
  _gate_id text,
  _site_id uuid,
  _zone_id uuid DEFAULT NULL,
  _tenant_id uuid DEFAULT NULL
) RETURNS jsonb 
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _visitor record;
  _visit record;
  _access record;
  _blacklist record;
  _settings record;
  _current_time time;
  _current_day smallint;
BEGIN
  _current_time := CURRENT_TIME;
  _current_day := EXTRACT(DOW FROM CURRENT_DATE)::smallint;
  
  SELECT * INTO _visitor 
  FROM visitors 
  WHERE qr_code_token = _qr_token 
    AND deleted_at IS NULL
    AND (_tenant_id IS NULL OR tenant_id = _tenant_id);
    
  IF NOT FOUND THEN 
    RETURN jsonb_build_object('valid', false, 'error', 'INVALID_QR', 'message', 'QR code not recognized');
  END IF;
  
  SELECT * INTO _blacklist 
  FROM check_visitor_blacklist(_visitor.national_id, _visitor.company_name, _visitor.tenant_id);
  
  IF _blacklist.is_blacklisted THEN
    RETURN jsonb_build_object(
      'valid', false, 
      'error', 'BLACKLISTED', 
      'message', 'Visitor or company is blacklisted',
      'reason', _blacklist.blacklist_reason
    );
  END IF;
  
  SELECT * INTO _visit 
  FROM visit_requests 
  WHERE visitor_id = _visitor.id 
    AND status = 'approved'
    AND valid_from <= NOW() 
    AND valid_until >= NOW()
    AND deleted_at IS NULL
  ORDER BY valid_from DESC
  LIMIT 1;
    
  IF NOT FOUND THEN 
    RETURN jsonb_build_object('valid', false, 'error', 'NO_ACTIVE_VISIT', 'message', 'No approved visit found for current time');
  END IF;
  
  IF _visit.entry_time_from IS NOT NULL AND _visit.entry_time_until IS NOT NULL THEN
    IF _current_time < _visit.entry_time_from OR _current_time > _visit.entry_time_until THEN
      RETURN jsonb_build_object(
        'valid', false, 
        'error', 'OUTSIDE_TIME_WINDOW', 
        'message', 'Access not permitted at this time',
        'allowed_from', _visit.entry_time_from,
        'allowed_until', _visit.entry_time_until
      );
    END IF;
  END IF;
  
  IF _zone_id IS NOT NULL THEN
    SELECT * INTO _access 
    FROM visitor_access_rules
    WHERE visit_request_id = _visit.id 
      AND zone_id = _zone_id
      AND is_active = true
      AND valid_from <= NOW()
      AND valid_until >= NOW()
      AND deleted_at IS NULL;
      
    IF NOT FOUND THEN 
      RETURN jsonb_build_object('valid', false, 'error', 'ZONE_NOT_AUTHORIZED', 'message', 'Access to this zone is not authorized');
    END IF;
    
    IF _access.allowed_days IS NOT NULL AND NOT (_current_day = ANY(_access.allowed_days)) THEN
      RETURN jsonb_build_object('valid', false, 'error', 'DAY_NOT_ALLOWED', 'message', 'Access not permitted on this day');
    END IF;
  END IF;
  
  SELECT * INTO _settings 
  FROM visitor_workflow_settings 
  WHERE tenant_id = _visitor.tenant_id 
    AND deleted_at IS NULL
  LIMIT 1;
  
  IF _visitor.visitor_type::text = 'contractor_visitor' THEN
    IF _settings.require_induction_for_types IS NOT NULL 
       AND 'contractor_visitor' = ANY(_settings.require_induction_for_types)
       AND _visitor.induction_completed_at IS NULL THEN
      RETURN jsonb_build_object('valid', false, 'error', 'INDUCTION_REQUIRED', 'message', 'Safety induction must be completed before entry');
    END IF;
  END IF;
  
  IF _settings.require_documents_for_types IS NOT NULL 
     AND _visitor.visitor_type::text = ANY(_settings.require_documents_for_types)
     AND NOT COALESCE(_visitor.documents_verified, false) THEN
    RETURN jsonb_build_object('valid', false, 'error', 'DOCUMENTS_REQUIRED', 'message', 'Documents must be verified before entry');
  END IF;
  
  RETURN jsonb_build_object(
    'valid', true,
    'visitor', jsonb_build_object(
      'id', _visitor.id,
      'full_name', _visitor.full_name,
      'company_name', _visitor.company_name,
      'visitor_type', _visitor.visitor_type,
      'photo_url', _visitor.photo_url
    ),
    'visit', jsonb_build_object(
      'id', _visit.id,
      'purpose', _visit.purpose,
      'host_id', _visit.host_id,
      'valid_until', _visit.valid_until
    ),
    'requires_escort', COALESCE(_visitor.requires_escort, false),
    'escort_id', _visitor.escort_id,
    'access_level', COALESCE(_visitor.default_access_level::text, 'escort_required')
  );
END;
$$;

CREATE OR REPLACE FUNCTION log_visitor_audit(
  _tenant_id uuid,
  _visitor_id uuid,
  _visit_request_id uuid,
  _action_type text,
  _action_category text,
  _actor_id uuid,
  _old_value jsonb DEFAULT NULL,
  _new_value jsonb DEFAULT NULL,
  _ip_address inet DEFAULT NULL,
  _user_agent text DEFAULT NULL,
  _gate_id text DEFAULT NULL
) RETURNS uuid 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _audit_id uuid;
  _actor_name text;
  _actor_role text;
BEGIN
  SELECT full_name, role INTO _actor_name, _actor_role
  FROM profiles WHERE id = _actor_id;
  
  INSERT INTO visitor_audit_log (
    tenant_id, visitor_id, visit_request_id,
    action_type, action_category,
    actor_id, actor_role, actor_name,
    old_value, new_value,
    ip_address, user_agent, gate_id
  ) VALUES (
    _tenant_id, _visitor_id, _visit_request_id,
    _action_type, _action_category,
    _actor_id, _actor_role, _actor_name,
    _old_value, _new_value,
    _ip_address, _user_agent, _gate_id
  ) RETURNING id INTO _audit_id;
  
  RETURN _audit_id;
END;
$$;

CREATE OR REPLACE FUNCTION update_visitor_timestamps() RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;