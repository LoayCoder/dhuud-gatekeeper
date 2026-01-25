/*
  # Workflow V1.1 Refactoring & Schema Expansion

  1. New Fields for Incidents
     - `is_auto_escalated` (boolean, default false)
     - `is_locked` (boolean, default false)
     - `ai_analysis_data` (jsonb, nullable)
     - `sla_screening_start_time` (timestamptz, nullable)
     - `status_changed_at` (timestamptz, default now()) - ensure it exists or add trigger

  2. New/Updated Tables
     - `incident_evidence`:
       - Supports Photo, CCTV, Document
       - `soft_delete` flag
       - RLS policies (view all, delete restricted to closed status)
     - `incident_rca`:
       - Structured schema for "5 Whys" and "Contributing Factors"
       - `is_locked` flag (unlock restricted to HSSE_MANAGER)
     - `contract_violations`:
       - Separate table linked to incident
       - Liability data vs fact-finding data
     - `witness_statements` (Update):
       - Add `status` (pending, review, approved)
       - Add `ai_analysis` (jsonb)
       - Add `transcription` (text)

  3. Functions & Logic
     - `check_sla_escalation()`: Database function to check if screening > 2h
     - `validate_incident_gate()`: Function to check validation gates
*/

-- 0. Ensure ENUMs exist and update incident_status
DO $$ BEGIN
    -- Add missing statuses to incident_status ENUM
    ALTER TYPE incident_status ADD VALUE IF NOT EXISTS 'draft';
    ALTER TYPE incident_status ADD VALUE IF NOT EXISTS 'pending_contractor_screening';
    ALTER TYPE incident_status ADD VALUE IF NOT EXISTS 'pending_investigator_assignment';
    ALTER TYPE incident_status ADD VALUE IF NOT EXISTS 'pending_witness_review';
    ALTER TYPE incident_status ADD VALUE IF NOT EXISTS 'pending_rca_locking';
    ALTER TYPE incident_status ADD VALUE IF NOT EXISTS 'pending_violation_approval';
    ALTER TYPE incident_status ADD VALUE IF NOT EXISTS 'pending_fine_calculation';
    ALTER TYPE incident_status ADD VALUE IF NOT EXISTS 'pending_action_verification';
    ALTER TYPE incident_status ADD VALUE IF NOT EXISTS 'pending_action_completion';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE incident_stage AS ENUM ('Draft', 'Screening', 'Investigation', 'Governance', 'Action_Management', 'Closed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE statement_method AS ENUM ('voice', 'text', 'upload');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 1. Update Incidents Table
ALTER TABLE incidents
ADD COLUMN IF NOT EXISTS is_auto_escalated boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS ai_analysis_data jsonb,
ADD COLUMN IF NOT EXISTS sla_screening_start_time timestamptz,
ADD COLUMN IF NOT EXISTS status_changed_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS stage incident_stage;

-- Function to maintain Stage based on Status
CREATE OR REPLACE FUNCTION maintain_incident_stage()
RETURNS TRIGGER AS $$
BEGIN
  -- Logic to infer Stage from Status
  CASE NEW.status
    -- Draft
    WHEN 'draft' THEN NEW.stage = 'Draft';

    -- Screening
    WHEN 'submitted' THEN NEW.stage = 'Screening';
    WHEN 'pending_dept_rep_approval' THEN NEW.stage = 'Screening';
    WHEN 'pending_contractor_screening' THEN NEW.stage = 'Screening';
    WHEN 'pending_consultant_screening' THEN NEW.stage = 'Screening';
    WHEN 'pending_site_client_approval' THEN NEW.stage = 'Screening';
    WHEN 'pending_contractor_implementation' THEN NEW.stage = 'Screening';
    WHEN 'pending_expert_screening' THEN NEW.stage = 'Screening';

    -- Investigation
    WHEN 'under_investigation' THEN NEW.stage = 'Investigation';
    WHEN 'pending_investigator_assignment' THEN NEW.stage = 'Investigation';
    WHEN 'pending_witness_review' THEN NEW.stage = 'Investigation';
    WHEN 'pending_rca_locking' THEN NEW.stage = 'Investigation';
    WHEN 'pending_hsse_validation' THEN NEW.stage = 'Investigation';

    -- Governance
    WHEN 'pending_legal_review' THEN NEW.stage = 'Governance';
    WHEN 'dispute_resolution' THEN NEW.stage = 'Governance';
    WHEN 'pending_contractor_dispute_review' THEN NEW.stage = 'Governance';
    WHEN 'pending_violation_approval' THEN NEW.stage = 'Governance';
    WHEN 'pending_fine_calculation' THEN NEW.stage = 'Governance';

    -- Action Management
    WHEN 'pending_action_completion' THEN NEW.stage = 'Action_Management';
    WHEN 'pending_action_verification' THEN NEW.stage = 'Action_Management';
    WHEN 'observation_actions_pending' THEN NEW.stage = 'Action_Management';
    WHEN 'pending_final_closure' THEN NEW.stage = 'Action_Management';
    WHEN 'monitoring_30_day' THEN NEW.stage = 'Action_Management';
    WHEN 'monitoring_60_day' THEN NEW.stage = 'Action_Management';
    WHEN 'monitoring_90_day' THEN NEW.stage = 'Action_Management';

    -- Closed
    WHEN 'closed' THEN NEW.stage = 'Closed';
    WHEN 'rejected_invalid' THEN NEW.stage = 'Closed';

    ELSE
        -- No default assignment to preserve previous values if not matched,
        -- or could default to Screening if strictly required.
        -- For now, we assume explicit mapping covers the workflow.
  END CASE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_maintain_incident_stage ON incidents;
CREATE TRIGGER trigger_maintain_incident_stage
BEFORE INSERT OR UPDATE OF status ON incidents
FOR EACH ROW
EXECUTE FUNCTION maintain_incident_stage();

-- Ensure status_changed_at is updated on status change
CREATE OR REPLACE FUNCTION update_status_changed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.status_changed_at = now();
    -- Set SLA start time if entering screening statuses
    IF NEW.status IN ('submitted', 'pending_expert_screening', 'pending_dept_rep_approval', 'pending_consultant_screening', 'pending_site_client_approval', 'pending_contractor_implementation')
       AND (OLD.status NOT IN ('submitted', 'pending_expert_screening', 'pending_dept_rep_approval', 'pending_consultant_screening', 'pending_site_client_approval', 'pending_contractor_implementation') OR OLD.status IS NULL) THEN
        NEW.sla_screening_start_time = now();
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_incident_status_timestamp ON incidents;
CREATE TRIGGER update_incident_status_timestamp
BEFORE UPDATE ON incidents
FOR EACH ROW
EXECUTE FUNCTION update_status_changed_at();

-- 2. Incident Evidence Table (New)
CREATE TABLE IF NOT EXISTS incident_evidence (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  incident_id uuid NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  evidence_type text NOT NULL CHECK (evidence_type IN ('photo', 'cctv', 'document')),
  file_url text, -- For photos/docs
  cctv_metadata jsonb, -- For CCTV (camera_id, timestamp_start, timestamp_end)
  description text,
  uploaded_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  is_soft_deleted boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS for Evidence
ALTER TABLE incident_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View incident evidence" ON incident_evidence
  FOR SELECT USING (tenant_id = get_auth_tenant_id() AND (NOT is_soft_deleted OR has_role(auth.uid(), 'admin')));

CREATE POLICY "Manage incident evidence" ON incident_evidence
  FOR ALL USING (tenant_id = get_auth_tenant_id())
  WITH CHECK (
    tenant_id = get_auth_tenant_id()
    AND (
      -- Cannot hard delete or soft delete if incident is closed, unless admin
      (SELECT status FROM incidents WHERE id = incident_id) != 'closed'
      OR has_role(auth.uid(), 'admin')
    )
  );

-- 3. Incident RCA Table (Structured)
CREATE TABLE IF NOT EXISTS incident_rca (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  incident_id uuid NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  five_whys jsonb, -- Array of { question: string, answer: string }
  root_cause_category text, -- enum but text for flexibility
  immediate_causes text[],
  underlying_causes text[],
  root_causes text[],
  contributing_factors jsonb, -- Array of { factor: string, category: string }
  is_locked boolean DEFAULT false,
  locked_by uuid REFERENCES profiles(id),
  locked_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(incident_id)
);

-- Enable RLS for RCA
ALTER TABLE incident_rca ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View RCA" ON incident_rca
  FOR SELECT USING (tenant_id = get_auth_tenant_id());

CREATE POLICY "Edit RCA" ON incident_rca
  FOR UPDATE USING (tenant_id = get_auth_tenant_id())
  WITH CHECK (
    tenant_id = get_auth_tenant_id()
    AND (
      NOT is_locked
      OR (is_locked AND has_role(auth.uid(), 'hsse_manager')) -- Only HSSE Manager can unlock/edit locked RCA
    )
  );

CREATE POLICY "Create RCA" ON incident_rca
  FOR INSERT WITH CHECK (tenant_id = get_auth_tenant_id());

-- 4. Witness Statements (Update)
ALTER TABLE witness_statements
ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending' CHECK (status IN ('pending', 'review', 'approved', 'returned')),
ADD COLUMN IF NOT EXISTS ai_analysis jsonb,
ADD COLUMN IF NOT EXISTS ai_transcription_text text,
ADD COLUMN IF NOT EXISTS statement_method statement_method;

-- 5. Contract Violations (Governance)
CREATE TABLE IF NOT EXISTS contract_violations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  incident_id uuid NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  contractor_id uuid REFERENCES contractor_companies(id), -- Assuming this table exists, or text name
  violation_type text NOT NULL,
  description text,
  fine_amount numeric,
  currency text DEFAULT 'USD',
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'finalized', 'rejected')),
  approved_by uuid REFERENCES profiles(id),
  approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE contract_violations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View violations" ON contract_violations
  FOR SELECT USING (tenant_id = get_auth_tenant_id());

CREATE POLICY "Manage violations" ON contract_violations
  FOR ALL USING (tenant_id = get_auth_tenant_id());

-- 6. Helper Functions

-- Function to unlock RCA (Explicit check)
CREATE OR REPLACE FUNCTION unlock_rca(rca_id uuid)
RETURNS boolean AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'hsse_manager') THEN
    RAISE EXCEPTION 'Only HSSE Managers can unlock RCA';
  END IF;

  UPDATE incident_rca
  SET is_locked = false, locked_by = NULL, locked_at = NULL
  WHERE id = rca_id AND tenant_id = get_auth_tenant_id();

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check SLA and Auto-Escalate
CREATE OR REPLACE FUNCTION check_sla_escalation(incident_id uuid)
RETURNS boolean AS $$
DECLARE
  v_incident incidents%ROWTYPE;
  v_threshold interval := '2 hours';
BEGIN
  SELECT * INTO v_incident FROM incidents WHERE id = incident_id;

  -- Check against ALL screening statuses defined in V1.1 workflow
  IF (v_incident.status = 'pending_expert_screening'
      OR v_incident.status = 'pending_dept_rep_approval'
      OR v_incident.status = 'pending_consultant_screening'
      OR v_incident.status = 'pending_site_client_approval'
      OR v_incident.status = 'pending_contractor_implementation')
     AND v_incident.sla_screening_start_time IS NOT NULL
     AND (now() - v_incident.sla_screening_start_time) > v_threshold
     AND NOT v_incident.is_auto_escalated THEN

     UPDATE incidents
     SET is_auto_escalated = true
         -- Logic for status change or notification trigger can be added here
     WHERE id = incident_id;

     RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- HARDENED VALIDATION GATE (Gate n26)
-- check_incident_closure_prerequisites update
CREATE OR REPLACE FUNCTION public.check_incident_closure_prerequisites(
  p_incident_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_incident RECORD;
  v_investigation RECORD;
  v_rca RECORD;
  v_blocking_reasons TEXT[] := '{}';
  v_open_actions INTEGER;
  v_unverified_actions INTEGER;
  v_pending_violations INTEGER;
  v_evidence_count INTEGER;
  v_unapproved_witnesses INTEGER;
  v_ready BOOLEAN := TRUE;
BEGIN
  -- Get incident
  SELECT * INTO v_incident
  FROM incidents
  WHERE id = p_incident_id
  AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Incident not found');
  END IF;

  -- Get investigation
  SELECT * INTO v_investigation
  FROM investigations
  WHERE incident_id = p_incident_id
  AND deleted_at IS NULL
  ORDER BY created_at DESC
  LIMIT 1;

  -- Get RCA
  SELECT * INTO v_rca
  FROM incident_rca
  WHERE incident_id = p_incident_id
  LIMIT 1;

  -- Check 1: Investigation exists and is completed
  IF v_investigation IS NULL THEN
    v_blocking_reasons := array_append(v_blocking_reasons, 'No investigation found');
    v_ready := FALSE;
  ELSIF v_investigation.completed_at IS NULL THEN
    v_blocking_reasons := array_append(v_blocking_reasons, 'Investigation not completed');
    v_ready := FALSE;
  END IF;

  -- Check 2: RCA Locking (Gate n26)
  IF v_rca IS NULL THEN
    v_blocking_reasons := array_append(v_blocking_reasons, 'RCA not started');
    v_ready := FALSE;
  ELSIF v_rca.is_locked IS NOT TRUE THEN
    v_blocking_reasons := array_append(v_blocking_reasons, 'RCA must be locked (finalized)');
    v_ready := FALSE;
  END IF;

  -- Check 3: Evidence Existence (Gate n26)
  SELECT COUNT(*) INTO v_evidence_count
  FROM incident_evidence
  WHERE incident_id = p_incident_id
  AND is_soft_deleted = false;

  IF v_evidence_count = 0 THEN
    v_blocking_reasons := array_append(v_blocking_reasons, 'At least one piece of evidence is required');
    v_ready := FALSE;
  END IF;

  -- Check 4: Witness Statements Status (Gate n26)
  SELECT COUNT(*) INTO v_unapproved_witnesses
  FROM witness_statements
  WHERE incident_id = p_incident_id
  AND deleted_at IS NULL
  AND status != 'approved'; -- Must be approved

  IF v_unapproved_witnesses > 0 THEN
    v_blocking_reasons := array_append(v_blocking_reasons, 'All witness statements must be approved');
    v_ready := FALSE;
  END IF;

  -- Check 5: Root cause analysis documented (Legacy check + RCA table check)
  IF v_investigation IS NOT NULL AND (v_investigation.root_cause IS NULL OR v_investigation.root_cause = '') THEN
     -- Fallback if RCA table empty, but RCA table takes precedence if exists
     IF v_rca IS NULL OR v_rca.root_causes IS NULL THEN
        v_blocking_reasons := array_append(v_blocking_reasons, 'Root cause analysis not documented');
        v_ready := FALSE;
     END IF;
  END IF;

  -- Check 6: All corrective actions completed
  SELECT COUNT(*) INTO v_open_actions
  FROM corrective_actions
  WHERE incident_id = p_incident_id
  AND deleted_at IS NULL
  AND status NOT IN ('completed', 'verified', 'closed', 'cancelled'); -- Added closed

  IF v_open_actions > 0 THEN
    v_blocking_reasons := array_append(v_blocking_reasons, format('%s corrective action(s) not completed', v_open_actions));
    v_ready := FALSE;
  END IF;

  -- Check 7: All actions verified (if status is completed but not closed/verified)
  SELECT COUNT(*) INTO v_unverified_actions
  FROM corrective_actions
  WHERE incident_id = p_incident_id
  AND deleted_at IS NULL
  AND status = 'completed';

  IF v_unverified_actions > 0 THEN
    v_blocking_reasons := array_append(v_blocking_reasons, format('%s corrective action(s) pending verification', v_unverified_actions));
    v_ready := FALSE;
  END IF;

  -- Check 8: If violation identified, must be finalized
  IF v_investigation IS NOT NULL AND v_investigation.violation_identified THEN
    SELECT COUNT(*) INTO v_pending_violations
    FROM incident_violation_lifecycle
    WHERE investigation_id = v_investigation.id
    AND deleted_at IS NULL
    AND final_status NOT IN ('finalized', 'cancelled');

    IF v_pending_violations > 0 THEN
      v_blocking_reasons := array_append(v_blocking_reasons, 'Contractor violation not finalized');
      v_ready := FALSE;
    END IF;
  END IF;

  -- Check 9: HSSE validation completed
  IF v_incident.hsse_validated_at IS NULL THEN
    v_blocking_reasons := array_append(v_blocking_reasons, 'HSSE validation not completed');
    v_ready := FALSE;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'ready_for_closure', v_ready,
    'blocking_reasons', to_jsonb(v_blocking_reasons),
    'checks', jsonb_build_object(
      'investigation_complete', v_investigation IS NOT NULL AND v_investigation.completed_at IS NOT NULL,
      'rca_locked', v_rca IS NOT NULL AND v_rca.is_locked,
      'evidence_present', v_evidence_count > 0,
      'witness_approved', v_unapproved_witnesses = 0,
      'all_actions_completed', v_open_actions = 0,
      'all_actions_verified', v_unverified_actions = 0,
      'violation_finalized', NOT (v_investigation IS NOT NULL AND v_investigation.violation_identified) OR v_pending_violations = 0,
      'hsse_validated', v_incident.hsse_validated_at IS NOT NULL
    )
  );
END;
$$;
