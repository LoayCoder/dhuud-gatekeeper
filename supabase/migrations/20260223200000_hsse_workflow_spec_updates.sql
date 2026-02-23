-- HSSE Workflow Spec Updates Migration
-- Addresses conflicts: C3 (osha_reportable status), C4 (pending_no_investigation_approval), 
-- C7 (reopen_count), C5 (expert_resubmission_count), C8 (litigation_hold), C14 (legal_reviewer role)

-- ============================================================================
-- 1. Add missing incident_status enum values
-- ============================================================================

-- C4: Add pending_no_investigation_approval status for Dept Manager approval gate
ALTER TYPE incident_status ADD VALUE IF NOT EXISTS 'pending_no_investigation_approval';

-- C3: Add osha_reportable status
ALTER TYPE incident_status ADD VALUE IF NOT EXISTS 'osha_reportable';

-- Add pending_escalation_approval for obs→incident conversion
ALTER TYPE incident_status ADD VALUE IF NOT EXISTS 'pending_escalation_approval';

-- Add dept_rep_rejected for dept rep rejection tracking
ALTER TYPE incident_status ADD VALUE IF NOT EXISTS 'dept_rep_rejected';

-- ============================================================================
-- 2. Add missing columns to incidents table
-- ============================================================================

-- C10: OSHA reportable flag
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS osha_reportable BOOLEAN DEFAULT FALSE;

-- C8: Litigation hold flag (blocks evidence deletion)
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS litigation_hold BOOLEAN DEFAULT FALSE;

-- C7: Reopen count for max 3 reopens enforcement
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS reopen_count INTEGER DEFAULT 0;

-- C5: Expert resubmission count for max 3 resubmissions
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS expert_resubmission_count INTEGER DEFAULT 0;

-- C6: Manager severity override tracking
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS manager_severity_override BOOLEAN DEFAULT FALSE;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS manager_severity_override_reason TEXT;

-- ============================================================================
-- 3. Add legal_reviewer role (C14)
-- ============================================================================

-- Add legal_reviewer to app_role enum if it exists
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

-- ============================================================================
-- 4. Update process_dept_rep_incident_decision RPC for C17 (return_for_correction)
-- ============================================================================

-- Note: The process_dept_rep_incident_decision RPC should be updated to handle
-- 'return_for_correction' decision type. This requires updating the existing
-- function to route to 'returned_to_reporter' status when this decision is made.
-- The exact implementation depends on the current RPC function body.

-- ============================================================================
-- 5. Add indexes for new columns used in queries
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_incidents_osha_reportable ON incidents (osha_reportable) WHERE osha_reportable = TRUE;
CREATE INDEX IF NOT EXISTS idx_incidents_litigation_hold ON incidents (litigation_hold) WHERE litigation_hold = TRUE;

-- ============================================================================
-- 6. Add comment for documentation
-- ============================================================================

COMMENT ON COLUMN incidents.osha_reportable IS 'C10: Auto-flagged when injury includes fatality, hospitalization, amputation, or eye loss';
COMMENT ON COLUMN incidents.litigation_hold IS 'C8: When true, blocks evidence deletion. Managed by legal_reviewer role';
COMMENT ON COLUMN incidents.reopen_count IS 'C7: Tracks number of reopens. Max 3 allowed';
COMMENT ON COLUMN incidents.expert_resubmission_count IS 'C5: Tracks expert rejection resubmissions. Max 3 allowed';
COMMENT ON COLUMN incidents.manager_severity_override IS 'C6: True when manager rejected severity but approved investigation';
COMMENT ON COLUMN incidents.manager_severity_override_reason IS 'C6: Reason for manager severity override';

-- ============================================================================
-- 7. C4 Data Migration: Grandfather existing no_investigation_required
-- ============================================================================
-- PURPOSE: Existing incidents that already reached 'no_investigation_required'
-- bypassed the new approval gate. We leave their status as-is (they are correctly
-- closed) but add an audit log entry marking them as grandfathered so reports
-- don't flag them as "missing approval".

INSERT INTO incident_audit_logs (incident_id, tenant_id, actor_id, action, details)
SELECT 
  i.id,
  i.tenant_id,
  i.reporter_id,  -- attribute to original reporter
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

-- ============================================================================
-- 8. Initialize reopen_count for previously-reopened incidents
-- ============================================================================
-- Count existing reopen audit entries to backfill reopen_count accurately

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

-- ============================================================================
-- ROLLBACK NOTES (manual — run only if reverting)
-- ============================================================================
-- To rollback this migration:
-- 1. DELETE FROM incident_audit_logs WHERE action = 'system_migration_c4_grandfather';
-- 2. ALTER TABLE incidents DROP COLUMN IF EXISTS osha_reportable;
-- 3. ALTER TABLE incidents DROP COLUMN IF EXISTS litigation_hold;
-- 4. ALTER TABLE incidents DROP COLUMN IF EXISTS reopen_count;
-- 5. ALTER TABLE incidents DROP COLUMN IF EXISTS expert_resubmission_count;
-- 6. ALTER TABLE incidents DROP COLUMN IF EXISTS manager_severity_override;
-- 7. ALTER TABLE incidents DROP COLUMN IF EXISTS manager_severity_override_reason;
-- NOTE: PostgreSQL enum values CANNOT be removed. The new statuses will remain
-- in the enum but will be unused if code is reverted.
