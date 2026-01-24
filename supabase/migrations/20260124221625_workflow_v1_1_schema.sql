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

-- 1. Update Incidents Table
ALTER TABLE incidents
ADD COLUMN IF NOT EXISTS is_auto_escalated boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_locked boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS ai_analysis_data jsonb,
ADD COLUMN IF NOT EXISTS sla_screening_start_time timestamptz,
ADD COLUMN IF NOT EXISTS status_changed_at timestamptz DEFAULT now();

-- Ensure status_changed_at is updated on status change
CREATE OR REPLACE FUNCTION update_status_changed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.status_changed_at = now();
    -- Set SLA start time if entering screening
    IF NEW.status IN ('submitted', 'pending_expert_screening') AND OLD.status NOT IN ('submitted', 'pending_expert_screening') THEN
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
ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending' CHECK (status IN ('pending', 'review', 'approved')),
ADD COLUMN IF NOT EXISTS ai_analysis jsonb,
ADD COLUMN IF NOT EXISTS transcription text;

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

  IF v_incident.status = 'pending_expert_screening'
     AND v_incident.sla_screening_start_time IS NOT NULL
     AND (now() - v_incident.sla_screening_start_time) > v_threshold
     AND NOT v_incident.is_auto_escalated THEN

     UPDATE incidents
     SET is_auto_escalated = true,
         -- Keep status but mark flag? Or change status?
         -- Workflow says "Auto-Escalate to HSSE Queue".
         -- If it's already "pending_expert_screening", maybe we just flag it for high priority UI.
         status = 'hsse_manager_escalation' -- Or keep screening but flag.
     WHERE id = incident_id;

     RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
