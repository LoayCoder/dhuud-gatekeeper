-- =====================================================
-- PHASE 1: VISITOR MODEL - DATABASE SCHEMA EXTENSIONS
-- =====================================================

-- 1.1 Add Visitor Type Enum
DO $$ BEGIN
  CREATE TYPE visitor_type AS ENUM (
    'guest',              -- General visitor
    'contractor_visitor', -- Contractor/vendor representative
    'trainer',            -- Trainer or event facilitator
    'vip'                 -- VIP/Special access
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 1.2 Add Visitor Access Level Enum
DO $$ BEGIN
  CREATE TYPE visitor_access_level AS ENUM (
    'escort_required',    -- Must be escorted at all times
    'supervised',         -- Can move within assigned zones with check-ins
    'unrestricted'        -- Full access within permitted zones/times
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 1.3 Add Visitor Approval Stage Enum
DO $$ BEGIN
  CREATE TYPE visitor_approval_stage AS ENUM (
    'area_rep',
    'hsse',
    'security',
    'site_client'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 1.4 Add Visitor Approval Decision Enum
DO $$ BEGIN
  CREATE TYPE visitor_approval_decision AS ENUM (
    'pending',
    'approved',
    'rejected',
    'escalated'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 1.5 Add Visitor Induction Status Enum
DO $$ BEGIN
  CREATE TYPE visitor_induction_status AS ENUM (
    'pending',
    'sent',
    'viewed',
    'completed',
    'expired'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- 2. EXTEND VISITORS TABLE
-- =====================================================

ALTER TABLE visitors 
ADD COLUMN IF NOT EXISTS visitor_type visitor_type DEFAULT 'guest';

ALTER TABLE visitors 
ADD COLUMN IF NOT EXISTS risk_classification smallint DEFAULT 1;

ALTER TABLE visitors 
ADD COLUMN IF NOT EXISTS requires_escort boolean DEFAULT false;

ALTER TABLE visitors 
ADD COLUMN IF NOT EXISTS escort_id uuid REFERENCES profiles(id);

ALTER TABLE visitors 
ADD COLUMN IF NOT EXISTS induction_completed_at timestamptz;

ALTER TABLE visitors 
ADD COLUMN IF NOT EXISTS induction_video_id uuid REFERENCES induction_videos(id);

ALTER TABLE visitors 
ADD COLUMN IF NOT EXISTS documents_verified boolean DEFAULT false;

ALTER TABLE visitors 
ADD COLUMN IF NOT EXISTS documents_verified_by uuid REFERENCES profiles(id);

ALTER TABLE visitors 
ADD COLUMN IF NOT EXISTS documents_verified_at timestamptz;

ALTER TABLE visitors 
ADD COLUMN IF NOT EXISTS default_access_level visitor_access_level DEFAULT 'escort_required';

-- =====================================================
-- 3. EXTEND VISIT_REQUESTS TABLE
-- =====================================================

ALTER TABLE visit_requests 
ADD COLUMN IF NOT EXISTS building_id uuid REFERENCES buildings(id);

ALTER TABLE visit_requests 
ADD COLUMN IF NOT EXISTS zone_id uuid REFERENCES security_zones(id);

ALTER TABLE visit_requests 
ADD COLUMN IF NOT EXISTS current_approval_stage visitor_approval_stage DEFAULT 'area_rep';

ALTER TABLE visit_requests 
ADD COLUMN IF NOT EXISTS area_rep_id uuid REFERENCES profiles(id);

ALTER TABLE visit_requests 
ADD COLUMN IF NOT EXISTS hsse_approval_required boolean DEFAULT false;

ALTER TABLE visit_requests 
ADD COLUMN IF NOT EXISTS hsse_approved_by uuid REFERENCES profiles(id);

ALTER TABLE visit_requests 
ADD COLUMN IF NOT EXISTS hsse_approved_at timestamptz;

ALTER TABLE visit_requests 
ADD COLUMN IF NOT EXISTS hsse_notes text;

ALTER TABLE visit_requests 
ADD COLUMN IF NOT EXISTS site_client_approval_required boolean DEFAULT false;

ALTER TABLE visit_requests 
ADD COLUMN IF NOT EXISTS site_client_approved_by uuid REFERENCES profiles(id);

ALTER TABLE visit_requests 
ADD COLUMN IF NOT EXISTS site_client_approved_at timestamptz;

ALTER TABLE visit_requests 
ADD COLUMN IF NOT EXISTS site_client_notes text;

ALTER TABLE visit_requests 
ADD COLUMN IF NOT EXISTS linked_incident_id uuid REFERENCES incidents(id);

ALTER TABLE visit_requests 
ADD COLUMN IF NOT EXISTS offline_validated boolean DEFAULT false;

ALTER TABLE visit_requests 
ADD COLUMN IF NOT EXISTS offline_validated_at timestamptz;

ALTER TABLE visit_requests 
ADD COLUMN IF NOT EXISTS offline_validator_device_id text;

ALTER TABLE visit_requests 
ADD COLUMN IF NOT EXISTS entry_time_from time;

ALTER TABLE visit_requests 
ADD COLUMN IF NOT EXISTS entry_time_until time;

-- =====================================================
-- 4. NEW TABLE: VISITOR_ACCESS_RULES
-- =====================================================

CREATE TABLE IF NOT EXISTS visitor_access_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  branch_id uuid REFERENCES branches(id),
  visitor_id uuid NOT NULL REFERENCES visitors(id) ON DELETE CASCADE,
  visit_request_id uuid REFERENCES visit_requests(id) ON DELETE CASCADE,
  
  site_id uuid REFERENCES sites(id),
  building_id uuid REFERENCES buildings(id),
  zone_id uuid REFERENCES security_zones(id),
  
  access_level visitor_access_level NOT NULL DEFAULT 'escort_required',
  
  valid_from timestamptz NOT NULL,
  valid_until timestamptz NOT NULL,
  allowed_entry_time_from time,
  allowed_entry_time_until time,
  allowed_days smallint[] DEFAULT ARRAY[0,1,2,3,4,5,6],
  
  requires_induction boolean DEFAULT false,
  requires_hsse_approval boolean DEFAULT false,
  requires_site_client_approval boolean DEFAULT false,
  
  is_active boolean DEFAULT true,
  revoked_at timestamptz,
  revoked_by uuid REFERENCES profiles(id),
  revoke_reason text,
  
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  
  CONSTRAINT valid_time_window CHECK (valid_until > valid_from)
);

CREATE INDEX IF NOT EXISTS idx_visitor_access_rules_tenant ON visitor_access_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_visitor_access_rules_visitor ON visitor_access_rules(visitor_id);
CREATE INDEX IF NOT EXISTS idx_visitor_access_rules_visit ON visitor_access_rules(visit_request_id);
CREATE INDEX IF NOT EXISTS idx_visitor_access_rules_zone ON visitor_access_rules(zone_id);
CREATE INDEX IF NOT EXISTS idx_visitor_access_rules_active ON visitor_access_rules(is_active) WHERE deleted_at IS NULL;

ALTER TABLE visitor_access_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_visitor_access_rules ON visitor_access_rules
  USING (tenant_id = (SELECT (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid));

-- =====================================================
-- 5. NEW TABLE: VISITOR_INDUCTIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS visitor_inductions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  branch_id uuid REFERENCES branches(id),
  visitor_id uuid NOT NULL REFERENCES visitors(id) ON DELETE CASCADE,
  visit_request_id uuid REFERENCES visit_requests(id) ON DELETE SET NULL,
  
  video_id uuid REFERENCES induction_videos(id),
  induction_type text DEFAULT 'general',
  
  status visitor_induction_status DEFAULT 'pending',
  sent_at timestamptz,
  sent_via text,
  viewed_at timestamptz,
  view_duration_seconds integer,
  acknowledged_at timestamptz,
  acknowledgment_signature text,
  
  expires_at date,
  
  quiz_required boolean DEFAULT false,
  quiz_score numeric(5,2),
  quiz_passed boolean,
  quiz_completed_at timestamptz,
  
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_visitor_inductions_tenant ON visitor_inductions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_visitor_inductions_visitor ON visitor_inductions(visitor_id);
CREATE INDEX IF NOT EXISTS idx_visitor_inductions_status ON visitor_inductions(status);

ALTER TABLE visitor_inductions ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_visitor_inductions ON visitor_inductions
  USING (tenant_id = (SELECT (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid));

-- =====================================================
-- 6. NEW TABLE: VISITOR_APPROVALS
-- =====================================================

CREATE TABLE IF NOT EXISTS visitor_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  branch_id uuid REFERENCES branches(id),
  visit_request_id uuid NOT NULL REFERENCES visit_requests(id) ON DELETE CASCADE,
  
  approval_stage visitor_approval_stage NOT NULL,
  stage_order smallint NOT NULL DEFAULT 1,
  
  approver_id uuid REFERENCES profiles(id),
  approver_role text,
  delegate_of uuid REFERENCES profiles(id),
  
  decision visitor_approval_decision DEFAULT 'pending',
  decision_at timestamptz,
  notes text,
  
  escalated_to uuid REFERENCES profiles(id),
  escalated_at timestamptz,
  escalation_reason text,
  
  auto_approved boolean DEFAULT false,
  auto_approval_rule text,
  
  due_by timestamptz,
  reminder_sent_at timestamptz,
  sla_breached boolean DEFAULT false,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_visitor_approvals_tenant ON visitor_approvals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_visitor_approvals_visit ON visitor_approvals(visit_request_id);
CREATE INDEX IF NOT EXISTS idx_visitor_approvals_approver ON visitor_approvals(approver_id);
CREATE INDEX IF NOT EXISTS idx_visitor_approvals_pending ON visitor_approvals(decision) WHERE decision = 'pending' AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_visitor_approvals_stage ON visitor_approvals(approval_stage, decision);

ALTER TABLE visitor_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_visitor_approvals ON visitor_approvals
  USING (tenant_id = (SELECT (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid));

-- =====================================================
-- 7. NEW TABLE: VISITOR_AUDIT_LOG
-- =====================================================

CREATE TABLE IF NOT EXISTS visitor_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  branch_id uuid REFERENCES branches(id),
  
  visitor_id uuid REFERENCES visitors(id) ON DELETE SET NULL,
  visit_request_id uuid REFERENCES visit_requests(id) ON DELETE SET NULL,
  
  action_type text NOT NULL,
  action_category text,
  
  actor_id uuid REFERENCES profiles(id),
  actor_role text,
  actor_name text,
  
  old_value jsonb,
  new_value jsonb,
  changes_summary text,
  
  ip_address inet,
  user_agent text,
  device_type text,
  location_lat numeric(10,7),
  location_lng numeric(10,7),
  gate_id text,
  
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_visitor_audit_tenant ON visitor_audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_visitor_audit_visitor ON visitor_audit_log(visitor_id);
CREATE INDEX IF NOT EXISTS idx_visitor_audit_visit ON visitor_audit_log(visit_request_id);
CREATE INDEX IF NOT EXISTS idx_visitor_audit_action ON visitor_audit_log(action_type);
CREATE INDEX IF NOT EXISTS idx_visitor_audit_date ON visitor_audit_log(created_at DESC);

ALTER TABLE visitor_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_visitor_audit ON visitor_audit_log
  FOR SELECT USING (tenant_id = (SELECT (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid));

-- =====================================================
-- 8. EXTEND VISITOR_WORKFLOW_SETTINGS
-- =====================================================

ALTER TABLE visitor_workflow_settings 
ADD COLUMN IF NOT EXISTS enable_area_rep_approval boolean DEFAULT true;

ALTER TABLE visitor_workflow_settings 
ADD COLUMN IF NOT EXISTS hsse_required_for_risk_level smallint DEFAULT 3;

ALTER TABLE visitor_workflow_settings 
ADD COLUMN IF NOT EXISTS site_client_required_zone_ids uuid[] DEFAULT '{}';

ALTER TABLE visitor_workflow_settings 
ADD COLUMN IF NOT EXISTS default_area_rep_id uuid REFERENCES profiles(id);

ALTER TABLE visitor_workflow_settings 
ADD COLUMN IF NOT EXISTS require_induction_for_types text[] DEFAULT ARRAY['contractor_visitor'];

ALTER TABLE visitor_workflow_settings 
ADD COLUMN IF NOT EXISTS require_documents_for_types text[] DEFAULT ARRAY['contractor_visitor', 'vip'];

ALTER TABLE visitor_workflow_settings 
ADD COLUMN IF NOT EXISTS approval_sla_hours jsonb DEFAULT '{"area_rep": 4, "hsse": 8, "security": 2, "site_client": 24}';

ALTER TABLE visitor_workflow_settings 
ADD COLUMN IF NOT EXISTS auto_approve_internal_employees boolean DEFAULT true;

ALTER TABLE visitor_workflow_settings 
ADD COLUMN IF NOT EXISTS induction_validity_days integer DEFAULT 365;

-- =====================================================
-- 9. LINK INCIDENTS TO VISITORS
-- =====================================================

ALTER TABLE incidents 
ADD COLUMN IF NOT EXISTS visitor_id uuid REFERENCES visitors(id);

ALTER TABLE incidents 
ADD COLUMN IF NOT EXISTS visit_request_id uuid REFERENCES visit_requests(id);

-- =====================================================
-- 10. HELPER FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION check_visitor_blacklist(
  _national_id text,
  _company_name text,
  _tenant_id uuid
) RETURNS TABLE (
  is_blacklisted boolean,
  blacklist_reason text,
  blacklist_type text
) AS $$
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
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION validate_visitor_access(
  _qr_token uuid,
  _gate_id text,
  _site_id uuid,
  _zone_id uuid DEFAULT NULL,
  _tenant_id uuid DEFAULT NULL
) RETURNS jsonb AS $$
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
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

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
) RETURNS uuid AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 11. UPDATE TIMESTAMP TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION update_visitor_timestamps() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_visitor_access_rules_timestamp ON visitor_access_rules;
CREATE TRIGGER update_visitor_access_rules_timestamp
  BEFORE UPDATE ON visitor_access_rules
  FOR EACH ROW EXECUTE FUNCTION update_visitor_timestamps();

DROP TRIGGER IF EXISTS update_visitor_inductions_timestamp ON visitor_inductions;
CREATE TRIGGER update_visitor_inductions_timestamp
  BEFORE UPDATE ON visitor_inductions
  FOR EACH ROW EXECUTE FUNCTION update_visitor_timestamps();

DROP TRIGGER IF EXISTS update_visitor_approvals_timestamp ON visitor_approvals;
CREATE TRIGGER update_visitor_approvals_timestamp
  BEFORE UPDATE ON visitor_approvals
  FOR EACH ROW EXECUTE FUNCTION update_visitor_timestamps();

-- =====================================================
-- 12. ENABLE REALTIME FOR VISITOR APPROVALS
-- =====================================================

ALTER PUBLICATION supabase_realtime ADD TABLE visitor_approvals;