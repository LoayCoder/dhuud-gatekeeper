-- =============================================
-- WORKFLOW GAPS IMPLEMENTATION - FULL MIGRATION
-- =============================================

-- Add new status values to incident_status enum
ALTER TYPE incident_status ADD VALUE IF NOT EXISTS 'pending_legal_review';
ALTER TYPE incident_status ADD VALUE IF NOT EXISTS 'dispute_resolution';
ALTER TYPE incident_status ADD VALUE IF NOT EXISTS 'monitoring_30_day';
ALTER TYPE incident_status ADD VALUE IF NOT EXISTS 'monitoring_60_day';
ALTER TYPE incident_status ADD VALUE IF NOT EXISTS 'monitoring_90_day';
ALTER TYPE incident_status ADD VALUE IF NOT EXISTS 'pending_contractor_dispute_review';

-- =============================================
-- GAP 1: Screening SLA Timer
-- =============================================

-- Add screening SLA columns to incidents
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS screening_sla_warning_sent_at timestamptz;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS screening_escalated_at timestamptz;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS screening_escalation_level integer DEFAULT 0;

-- Create screening SLA configuration table
CREATE TABLE IF NOT EXISTS screening_sla_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  severity_level text NOT NULL,
  max_screening_hours integer NOT NULL DEFAULT 4,
  warning_hours_before integer NOT NULL DEFAULT 1,
  escalation_hours integer NOT NULL DEFAULT 2,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE(tenant_id, severity_level)
);

-- Enable RLS on screening_sla_configs
ALTER TABLE screening_sla_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for screening_sla_configs"
  ON screening_sla_configs
  FOR ALL
  USING (tenant_id = get_auth_tenant_id());

-- =============================================
-- GAP 2: Legal/HR Review Step
-- =============================================

-- Add legal review columns to incidents
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS requires_legal_review boolean DEFAULT false;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS legal_reviewer_id uuid REFERENCES profiles(id);
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS legal_reviewed_at timestamptz;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS legal_review_notes text;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS legal_decision text;

-- Create legal review triggers configuration table
CREATE TABLE IF NOT EXISTS legal_review_triggers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  trigger_type text NOT NULL,
  trigger_value text,
  is_active boolean DEFAULT true,
  auto_route boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

-- Enable RLS on legal_review_triggers
ALTER TABLE legal_review_triggers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for legal_review_triggers"
  ON legal_review_triggers
  FOR ALL
  USING (tenant_id = get_auth_tenant_id());

-- =============================================
-- GAP 3: Dispute Resolution State
-- =============================================

-- Add dispute resolution columns to incidents
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS dispute_opened_at timestamptz;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS dispute_opened_by uuid REFERENCES profiles(id);
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS dispute_category text;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS dispute_evidence_attachments jsonb DEFAULT '[]'::jsonb;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS mediator_id uuid REFERENCES profiles(id);
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS mediation_notes text;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS mediation_decision text;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS mediation_completed_at timestamptz;

-- =============================================
-- GAP 4: Effectiveness Monitoring Period
-- =============================================

-- Add monitoring columns to incidents
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS monitoring_period_days integer;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS monitoring_started_at timestamptz;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS monitoring_due_at timestamptz;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS monitoring_check_notes jsonb DEFAULT '[]'::jsonb;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS recurrence_detected boolean DEFAULT false;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS recurrence_incident_id uuid REFERENCES incidents(id);

-- Create monitoring check schedule table
CREATE TABLE IF NOT EXISTS monitoring_check_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  scheduled_date date NOT NULL,
  check_type text NOT NULL DEFAULT 'periodic',
  completed_at timestamptz,
  completed_by uuid REFERENCES profiles(id),
  status text NOT NULL DEFAULT 'pending',
  findings text,
  recurrence_found boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

-- Enable RLS on monitoring_check_schedule
ALTER TABLE monitoring_check_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for monitoring_check_schedule"
  ON monitoring_check_schedule
  FOR ALL
  USING (tenant_id = get_auth_tenant_id());

-- Create monitoring period configuration table
CREATE TABLE IF NOT EXISTS monitoring_period_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  severity_level text NOT NULL,
  monitoring_days integer NOT NULL DEFAULT 30,
  check_interval_days integer NOT NULL DEFAULT 7,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE(tenant_id, severity_level)
);

-- Enable RLS on monitoring_period_configs
ALTER TABLE monitoring_period_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for monitoring_period_configs"
  ON monitoring_period_configs
  FOR ALL
  USING (tenant_id = get_auth_tenant_id());

-- =============================================
-- GAP 5: Contractor Dispute Channel
-- =============================================

-- Add contractor dispute columns to incidents
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS contractor_disputes_violation boolean DEFAULT false;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS contractor_dispute_submitted_at timestamptz;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS contractor_dispute_reason text;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS contractor_dispute_evidence jsonb DEFAULT '[]'::jsonb;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS contractor_dispute_status text;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS contractor_dispute_reviewed_by uuid REFERENCES profiles(id);
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS contractor_dispute_decision_notes text;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS contractor_dispute_resolved_at timestamptz;

-- Create contractor disputes table for detailed tracking
CREATE TABLE IF NOT EXISTS contractor_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contractor_id uuid REFERENCES contractors(id),
  submitted_by uuid REFERENCES profiles(id),
  submitted_at timestamptz DEFAULT now(),
  dispute_type text NOT NULL,
  dispute_reason text NOT NULL,
  evidence_attachments jsonb DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pending_review',
  reviewed_by uuid REFERENCES profiles(id),
  reviewed_at timestamptz,
  decision text,
  decision_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

-- Enable RLS on contractor_disputes
ALTER TABLE contractor_disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for contractor_disputes"
  ON contractor_disputes
  FOR ALL
  USING (tenant_id = get_auth_tenant_id());

-- =============================================
-- Insert default SLA configurations
-- =============================================

CREATE OR REPLACE FUNCTION initialize_workflow_gap_configs(p_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert default screening SLA configs
  INSERT INTO screening_sla_configs (tenant_id, severity_level, max_screening_hours, warning_hours_before, escalation_hours)
  VALUES 
    (p_tenant_id, 'Level 1', 24, 4, 8),
    (p_tenant_id, 'Level 2', 12, 2, 4),
    (p_tenant_id, 'Level 3', 8, 2, 4),
    (p_tenant_id, 'Level 4', 4, 1, 2),
    (p_tenant_id, 'Level 5', 2, 1, 1)
  ON CONFLICT (tenant_id, severity_level) DO NOTHING;

  -- Insert default legal review triggers
  INSERT INTO legal_review_triggers (tenant_id, trigger_type, trigger_value, is_active, auto_route)
  VALUES 
    (p_tenant_id, 'severity_level', 'Level 5', true, true),
    (p_tenant_id, 'has_injury', 'true', true, true),
    (p_tenant_id, 'incident_type', 'security_breach', true, true),
    (p_tenant_id, 'incident_type', 'harassment', true, true)
  ON CONFLICT DO NOTHING;

  -- Insert default monitoring period configs
  INSERT INTO monitoring_period_configs (tenant_id, severity_level, monitoring_days, check_interval_days)
  VALUES 
    (p_tenant_id, 'Level 1', 30, 15),
    (p_tenant_id, 'Level 2', 30, 10),
    (p_tenant_id, 'Level 3', 60, 14),
    (p_tenant_id, 'Level 4', 90, 14),
    (p_tenant_id, 'Level 5', 90, 7)
  ON CONFLICT (tenant_id, severity_level) DO NOTHING;
END;
$$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_incidents_screening_escalation ON incidents(status, screening_escalation_level) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_incidents_monitoring_status ON incidents(status, monitoring_due_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_incidents_legal_review ON incidents(requires_legal_review, legal_decision) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_monitoring_check_schedule_pending ON monitoring_check_schedule(scheduled_date, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contractor_disputes_status ON contractor_disputes(status, incident_id) WHERE deleted_at IS NULL;