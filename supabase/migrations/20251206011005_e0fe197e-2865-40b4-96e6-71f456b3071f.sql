
-- ============================================
-- INCIDENT REPORTING & INVESTIGATION MODULE
-- Multi-Tenant, HSSA Compliant, 20k+ Users
-- ============================================

-- 1. CREATE ENUMS
CREATE TYPE incident_status AS ENUM (
  'submitted', 
  'pending_review', 
  'investigation_pending', 
  'investigation_in_progress', 
  'closed'
);

CREATE TYPE severity_level AS ENUM ('low', 'medium', 'high', 'critical');

-- 2. HSSE INCIDENT ACCESS HELPER FUNCTION
CREATE OR REPLACE FUNCTION has_hsse_incident_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT has_role(_user_id, 'admin'::app_role) 
    OR has_role_by_code(_user_id, 'hsse_officer')
    OR has_role_by_code(_user_id, 'hsse_investigator')
    OR has_role_by_code(_user_id, 'hsse_manager')
    OR has_role_by_code(_user_id, 'incident_analyst')
    OR has_role_by_code(_user_id, 'emergency_response_leader')
$$;

-- 3. INCIDENTS TABLE (Core)
CREATE TABLE incidents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid REFERENCES tenants(id) NOT NULL,
  reference_id text UNIQUE,
  title text NOT NULL,
  description text NOT NULL,
  occurred_at timestamptz DEFAULT now(),
  event_type text NOT NULL,
  subtype text,
  location text,
  department text,
  severity severity_level,
  immediate_actions text,
  has_injury boolean DEFAULT false,
  injury_details jsonb,
  has_damage boolean DEFAULT false,
  damage_details jsonb,
  status incident_status DEFAULT 'submitted',
  reporter_id uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

-- Incidents Indexes
CREATE INDEX idx_incidents_tenant_status ON incidents(tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_incidents_tenant_severity ON incidents(tenant_id, severity) WHERE deleted_at IS NULL;
CREATE INDEX idx_incidents_tenant_created ON incidents(tenant_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_incidents_reporter ON incidents(reporter_id);
CREATE INDEX idx_incidents_occurred ON incidents(occurred_at DESC);
CREATE INDEX idx_incidents_reference ON incidents(reference_id);

-- Incidents Updated_at Trigger
CREATE TRIGGER update_incidents_updated_at 
  BEFORE UPDATE ON incidents 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. INVESTIGATIONS TABLE
CREATE TABLE investigations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid REFERENCES tenants(id) NOT NULL,
  incident_id uuid REFERENCES incidents(id) ON DELETE CASCADE,
  investigator_id uuid REFERENCES profiles(id),
  started_at timestamptz,
  completed_at timestamptz,
  immediate_cause text,
  underlying_cause text,
  root_cause text,
  contributing_factors text,
  five_whys jsonb,
  findings_summary text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

-- Investigations Indexes
CREATE INDEX idx_investigations_tenant ON investigations(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_investigations_incident ON investigations(incident_id);
CREATE INDEX idx_investigations_investigator ON investigations(investigator_id);

-- Investigations Updated_at Trigger
CREATE TRIGGER update_investigations_updated_at 
  BEFORE UPDATE ON investigations 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. WITNESS STATEMENTS TABLE
CREATE TABLE witness_statements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid REFERENCES tenants(id) NOT NULL,
  incident_id uuid REFERENCES incidents(id) ON DELETE CASCADE,
  witness_name text NOT NULL,
  witness_contact text,
  statement_text text NOT NULL,
  statement_date date DEFAULT CURRENT_DATE,
  attachment_url text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

-- Witness Statements Indexes
CREATE INDEX idx_witness_statements_tenant ON witness_statements(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_witness_statements_incident ON witness_statements(incident_id);

-- Witness Statements Updated_at Trigger
CREATE TRIGGER update_witness_statements_updated_at 
  BEFORE UPDATE ON witness_statements 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. CORRECTIVE ACTIONS TABLE
CREATE TABLE corrective_actions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid REFERENCES tenants(id) NOT NULL,
  incident_id uuid REFERENCES incidents(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  action_type text DEFAULT 'corrective',
  assigned_to uuid REFERENCES profiles(id),
  due_date date,
  completed_date date,
  priority text DEFAULT 'medium',
  status text DEFAULT 'assigned',
  verification_notes text,
  verified_by uuid REFERENCES profiles(id),
  verified_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

-- Corrective Actions Indexes
CREATE INDEX idx_corrective_actions_tenant ON corrective_actions(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_corrective_actions_incident ON corrective_actions(incident_id);
CREATE INDEX idx_corrective_actions_assigned ON corrective_actions(assigned_to);
CREATE INDEX idx_corrective_actions_status_due ON corrective_actions(status, due_date) WHERE deleted_at IS NULL;

-- Corrective Actions Updated_at Trigger
CREATE TRIGGER update_corrective_actions_updated_at 
  BEFORE UPDATE ON corrective_actions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. INCIDENT AUDIT LOGS TABLE (HSSA Compliance)
CREATE TABLE incident_audit_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid REFERENCES tenants(id) NOT NULL,
  incident_id uuid REFERENCES incidents(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES profiles(id),
  action text NOT NULL,
  old_value jsonb,
  new_value jsonb,
  details jsonb,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

-- Audit Logs Indexes
CREATE INDEX idx_incident_audit_tenant ON incident_audit_logs(tenant_id);
CREATE INDEX idx_incident_audit_incident ON incident_audit_logs(incident_id);
CREATE INDEX idx_incident_audit_created ON incident_audit_logs(created_at DESC);

-- 8. REFERENCE ID AUTO-GENERATION TRIGGER
CREATE OR REPLACE FUNCTION generate_incident_reference_id()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  year_suffix text;
  sequence_num integer;
BEGIN
  year_suffix := TO_CHAR(NOW(), 'YYYY');
  
  SELECT COALESCE(MAX(
    CAST(NULLIF(SPLIT_PART(reference_id, '-', 3), '') AS INTEGER)
  ), 0) + 1
  INTO sequence_num
  FROM incidents
  WHERE tenant_id = NEW.tenant_id
    AND reference_id LIKE 'INC-' || year_suffix || '-%';
  
  NEW.reference_id := 'INC-' || year_suffix || '-' || LPAD(sequence_num::text, 4, '0');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_incident_reference_id
  BEFORE INSERT ON incidents
  FOR EACH ROW
  WHEN (NEW.reference_id IS NULL)
  EXECUTE FUNCTION generate_incident_reference_id();

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- 9. INCIDENTS RLS
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tenant incidents" ON incidents
FOR SELECT USING (
  tenant_id = get_auth_tenant_id()
  AND deleted_at IS NULL
);

CREATE POLICY "Users can create incidents" ON incidents
FOR INSERT WITH CHECK (
  tenant_id = get_auth_tenant_id()
);

CREATE POLICY "HSSE users can update incidents" ON incidents
FOR UPDATE USING (
  tenant_id = get_auth_tenant_id()
  AND deleted_at IS NULL
  AND (has_hsse_incident_access(auth.uid()) OR reporter_id = auth.uid())
);

CREATE POLICY "Admins can delete incidents" ON incidents
FOR DELETE USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND tenant_id = get_auth_tenant_id()
);

-- 10. INVESTIGATIONS RLS
ALTER TABLE investigations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tenant investigations" ON investigations
FOR SELECT USING (
  tenant_id = get_auth_tenant_id()
  AND deleted_at IS NULL
);

CREATE POLICY "HSSE users can create investigations" ON investigations
FOR INSERT WITH CHECK (
  tenant_id = get_auth_tenant_id()
  AND has_hsse_incident_access(auth.uid())
);

CREATE POLICY "HSSE users can update investigations" ON investigations
FOR UPDATE USING (
  tenant_id = get_auth_tenant_id()
  AND deleted_at IS NULL
  AND has_hsse_incident_access(auth.uid())
);

CREATE POLICY "Admins can delete investigations" ON investigations
FOR DELETE USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND tenant_id = get_auth_tenant_id()
);

-- 11. WITNESS STATEMENTS RLS
ALTER TABLE witness_statements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tenant witness statements" ON witness_statements
FOR SELECT USING (
  tenant_id = get_auth_tenant_id()
  AND deleted_at IS NULL
);

CREATE POLICY "HSSE users can create witness statements" ON witness_statements
FOR INSERT WITH CHECK (
  tenant_id = get_auth_tenant_id()
  AND has_hsse_incident_access(auth.uid())
);

CREATE POLICY "HSSE users can update witness statements" ON witness_statements
FOR UPDATE USING (
  tenant_id = get_auth_tenant_id()
  AND deleted_at IS NULL
  AND has_hsse_incident_access(auth.uid())
);

CREATE POLICY "Admins can delete witness statements" ON witness_statements
FOR DELETE USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND tenant_id = get_auth_tenant_id()
);

-- 12. CORRECTIVE ACTIONS RLS
ALTER TABLE corrective_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tenant corrective actions" ON corrective_actions
FOR SELECT USING (
  tenant_id = get_auth_tenant_id()
  AND deleted_at IS NULL
);

CREATE POLICY "HSSE users can create corrective actions" ON corrective_actions
FOR INSERT WITH CHECK (
  tenant_id = get_auth_tenant_id()
  AND has_hsse_incident_access(auth.uid())
);

CREATE POLICY "HSSE or assigned users can update corrective actions" ON corrective_actions
FOR UPDATE USING (
  tenant_id = get_auth_tenant_id()
  AND deleted_at IS NULL
  AND (has_hsse_incident_access(auth.uid()) OR assigned_to = auth.uid())
);

CREATE POLICY "Admins can delete corrective actions" ON corrective_actions
FOR DELETE USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND tenant_id = get_auth_tenant_id()
);

-- 13. INCIDENT AUDIT LOGS RLS (Read-only for users, admins manage)
ALTER TABLE incident_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "HSSE users can view tenant audit logs" ON incident_audit_logs
FOR SELECT USING (
  tenant_id = get_auth_tenant_id()
  AND has_hsse_incident_access(auth.uid())
);

CREATE POLICY "System can insert audit logs" ON incident_audit_logs
FOR INSERT WITH CHECK (
  tenant_id = get_auth_tenant_id()
);

-- No UPDATE or DELETE on audit logs (immutable for compliance)
