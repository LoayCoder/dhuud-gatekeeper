-- HSSE Workflow Spec Updates Migration
-- Addresses conflicts: C3 (osha_reportable status), C4 (pending_no_investigation_approval), 
-- C7 (reopen_count), C5 (expert_resubmission_count), C8 (litigation_hold), C14 (legal_reviewer role)

-- 1. Add missing incident_status enum values
ALTER TYPE incident_status ADD VALUE IF NOT EXISTS 'pending_no_investigation_approval';
ALTER TYPE incident_status ADD VALUE IF NOT EXISTS 'osha_reportable';
ALTER TYPE incident_status ADD VALUE IF NOT EXISTS 'pending_escalation_approval';
ALTER TYPE incident_status ADD VALUE IF NOT EXISTS 'dept_rep_rejected';

-- 2. Add missing columns to incidents table
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS osha_reportable BOOLEAN DEFAULT FALSE;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS litigation_hold BOOLEAN DEFAULT FALSE;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS reopen_count INTEGER DEFAULT 0;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS expert_resubmission_count INTEGER DEFAULT 0;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS manager_severity_override BOOLEAN DEFAULT FALSE;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS manager_severity_override_reason TEXT;

-- 3. Add legal_reviewer role
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    BEGIN
      ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'legal_reviewer';
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END IF;
END$$;

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_incidents_osha_reportable ON incidents (osha_reportable) WHERE osha_reportable = TRUE;
CREATE INDEX IF NOT EXISTS idx_incidents_litigation_hold ON incidents (litigation_hold) WHERE litigation_hold = TRUE;

-- 5. Comments
COMMENT ON COLUMN incidents.osha_reportable IS 'C10: Auto-flagged when injury includes fatality, hospitalization, amputation, or eye loss';
COMMENT ON COLUMN incidents.litigation_hold IS 'C8: When true, blocks evidence deletion. Managed by legal_reviewer role';
COMMENT ON COLUMN incidents.reopen_count IS 'C7: Tracks number of reopens. Max 3 allowed';
COMMENT ON COLUMN incidents.expert_resubmission_count IS 'C5: Tracks expert rejection resubmissions. Max 3 allowed';
COMMENT ON COLUMN incidents.manager_severity_override IS 'C6: True when manager rejected severity but approved investigation';
COMMENT ON COLUMN incidents.manager_severity_override_reason IS 'C6: Reason for manager severity override';

-- 6. Grandfather existing no_investigation_required incidents
INSERT INTO incident_audit_logs (incident_id, tenant_id, actor_id, action, details)
SELECT 
  i.id, i.tenant_id, i.reporter_id,
  'system_migration_c4_grandfather',
  jsonb_build_object(
    'note', 'Grandfathered: pre-approval-gate no_investigation incident',
    'migration', 'hsse_workflow_spec_updates_20260223',
    'original_status', 'no_investigation_required',
    'requires_manager_review', false
  )
FROM incidents i
WHERE i.status = 'no_investigation_required'
  AND NOT EXISTS (
    SELECT 1 FROM incident_audit_logs al 
    WHERE al.incident_id = i.id 
      AND al.action = 'system_migration_c4_grandfather'
  );

-- 7. Backfill reopen_count
UPDATE incidents i
SET reopen_count = sub.cnt
FROM (
  SELECT incident_id, COUNT(*) as cnt
  FROM incident_audit_logs
  WHERE action LIKE '%reopen%'
  GROUP BY incident_id
) sub
WHERE i.id = sub.incident_id
  AND (i.reopen_count IS NULL OR i.reopen_count = 0);