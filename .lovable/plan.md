

# Implement 5 Deferred HSSE Workflow Server-Side Features

## Overview

Implement C11 (Investigation 30-Day SLA), C12 (Monitoring 90-Day Auto-Close), C13 (Evidence Retention Purge), C16 (Duplicate Detection), and C18 (HSSE Manager Verification) as database functions, edge functions, and cron jobs.

---

## Current State Summary

- **Investigation SLA Edge Function** already exists at `supabase/functions/investigation-sla-escalation/index.ts` -- it handles per-severity SLA configs. C11 adds a simpler 30-day blanket breach flag on the `incidents` table itself.
- **`incidents` table** has `monitoring_started_at`, `litigation_hold`, but does NOT have `sla_breached` or `investigation_started_at` columns yet.
- **Evidence** is stored in two tables: `incident_evidence` and `evidence_items`, with files in the `incident-attachments` storage bucket.
- **`pg_trgm` extension** is NOT enabled -- needed for C16.
- **`user_role_assignments`** uses `role_id` (UUID FK to `roles` table), not text role codes. The `roles` table has `code` (e.g., `hsse_manager`).
- **`has_hsse_incident_access()`** function already exists for broad HSSE role checks.

---

## Feature 1: C11 -- Investigation 30-Day SLA Auto-Escalation

### Database Migration

Add two columns to `incidents`:

```text
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS investigation_started_at TIMESTAMPTZ;
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS sla_breached BOOLEAN DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_incidents_sla_breached ON incidents (sla_breached) WHERE sla_breached = TRUE;
```

### Edge Function: `hsse-cron/index.ts`

Create a single unified cron edge function that accepts a `job` query parameter (`sla_check`, `monitoring_termination`, `evidence_purge`).

**`sla_check` job logic:**
1. Query incidents where `status = 'investigation_in_progress'`, `investigation_started_at < NOW() - 30 days`, `sla_breached IS NOT TRUE`, `deleted_at IS NULL`
2. For each match:
   - Update `sla_breached = true`
   - Insert audit log: `{ action: 'sla_30d_breach', incident_id, details: { days_elapsed } }`
   - Call `dispatch-incident-notification` with `event_type: 'sla_30d_breach'`
3. Do NOT change status or close investigation

### Cron Schedule

Hourly: `0 * * * *`

---

## Feature 2: C12 -- Monitoring 90-Day Auto-Termination

### Edge Function (same `hsse-cron`)

**`monitoring_termination` job logic:**
1. Query incidents where status contains `monitoring` (covers `monitoring_30_day`, `monitoring_60_day`, `monitoring_90_day`), `monitoring_started_at < NOW() - 90 days`, `deleted_at IS NULL`
2. For each match:
   - Update `status = 'closed'`, `closed_at = NOW()`
   - Insert audit log: `{ action: 'monitoring_auto_terminated_90d' }`
   - Call `dispatch-incident-notification` with `event_type: 'monitoring_auto_terminated'`

### Cron Schedule

Daily at 6:00 AM UTC: `0 6 * * *`

---

## Feature 3: C13 -- Evidence Retention Purge

### Edge Function (same `hsse-cron`)

**`evidence_purge` job logic:**
1. Query both `incident_evidence` and `evidence_items` where `created_at < NOW() - 2555 days` (7 years)
2. For each record, join to `incidents` to check `litigation_hold` -- skip if `true`
3. Delete the physical file from `incident-attachments` storage bucket using the `file_url` / `storage_path`
4. Delete the database row (hard delete -- retention period has passed)
5. Insert audit log: `{ action: 'evidence_purged_retention', details: { file_name, evidence_id, reason: '7yr_retention_expired' } }`

### Safety Measures
- Check `litigation_hold` per-incident before any deletion
- Log every deletion to `incident_audit_logs`
- Idempotent: already-deleted files are skipped gracefully

### Cron Schedule

Weekly, Sunday 3:00 AM UTC: `0 3 * * 0`

---

## Feature 4: C16 -- Tenant-Scoped Duplicate Detection

### Database Migration

```text
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE OR REPLACE FUNCTION public.check_duplicate_incident(
  p_tenant_id UUID,
  p_department_id UUID,
  p_title TEXT,
  p_occurred_at TIMESTAMPTZ
) RETURNS TABLE (
  duplicate_id UUID,
  duplicate_reference_id TEXT,
  duplicate_title TEXT,
  similarity_score REAL
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    i.id AS duplicate_id,
    i.reference_id AS duplicate_reference_id,
    i.title AS duplicate_title,
    similarity(i.title, p_title) AS similarity_score
  FROM incidents i
  WHERE i.tenant_id = p_tenant_id
    AND i.department_id = p_department_id
    AND i.deleted_at IS NULL
    AND i.status != 'closed'
    AND similarity(i.title, p_title) >= 0.6
    AND i.occurred_at BETWEEN p_occurred_at - INTERVAL '24 hours'
                        AND p_occurred_at + INTERVAL '24 hours'
  ORDER BY similarity_score DESC
  LIMIT 5;
$$;
```

Also add a GIN trigram index for performance:

```text
CREATE INDEX IF NOT EXISTS idx_incidents_title_trgm ON incidents USING gin (title gin_trgm_ops);
```

### Frontend Integration (not in this scope)

The frontend will call `supabase.rpc('check_duplicate_incident', { p_tenant_id, p_department_id, p_title, p_occurred_at })` before inserting and show a warning dialog.

---

## Feature 5: C18 -- HSSE Manager Role Verification

### Database Migration

```text
CREATE OR REPLACE FUNCTION public.verify_hsse_manager_access(
  p_user_id UUID,
  p_incident_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role_code TEXT;
  v_branch_id UUID;
  v_incident_branch UUID;
BEGIN
  -- Check if user has hsse_manager role
  SELECT r.code, ura.branch_id
  INTO v_role_code, v_branch_id
  FROM user_role_assignments ura
  JOIN roles r ON r.id = ura.role_id
  WHERE ura.user_id = p_user_id
    AND r.code = 'hsse_manager'
  LIMIT 1;

  IF v_role_code IS NULL THEN
    RETURN jsonb_build_object(
      'authorized', false,
      'reason', 'User does not have hsse_manager role'
    );
  END IF;

  -- If incident provided, verify branch match
  IF p_incident_id IS NOT NULL THEN
    SELECT branch_id INTO v_incident_branch
    FROM incidents
    WHERE id = p_incident_id AND deleted_at IS NULL;

    IF v_incident_branch IS NULL THEN
      RETURN jsonb_build_object('authorized', false, 'reason', 'Incident not found');
    END IF;

    IF v_branch_id IS NOT NULL AND v_branch_id != v_incident_branch THEN
      RETURN jsonb_build_object(
        'authorized', false,
        'reason', 'Branch mismatch',
        'user_branch', v_branch_id,
        'incident_branch', v_incident_branch
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'authorized', true,
    'role', 'hsse_manager',
    'branch_id', v_branch_id
  );
END;
$$;
```

---

## File Summary

| # | File | Type | Feature |
|---|------|------|---------|
| 1 | `supabase/migrations/20260223_c11_c12_c13_c16_c18.sql` | New (migration) | Add `investigation_started_at`, `sla_breached` columns; enable `pg_trgm`; create `check_duplicate_incident` and `verify_hsse_manager_access` RPCs |
| 2 | `supabase/functions/hsse-cron/index.ts` | New (edge function) | Unified cron handler for C11, C12, C13 |
| 3 | `supabase/config.toml` | Modify | Add `[functions.hsse-cron]` with `verify_jwt = false` |

### Cron Scheduling (pg_cron + pg_net)

Three `cron.schedule()` calls to invoke the edge function:
- C11: hourly (`0 * * * *`) with `?job=sla_check`
- C12: daily 6AM UTC (`0 6 * * *`) with `?job=monitoring_termination`
- C13: weekly Sunday 3AM UTC (`0 3 * * 0`) with `?job=evidence_purge`

These will be set up via the data insert tool (not migration) since they contain project-specific URLs and keys.

### Rollback

```text
-- Columns
ALTER TABLE incidents DROP COLUMN IF EXISTS sla_breached;
ALTER TABLE incidents DROP COLUMN IF EXISTS investigation_started_at;

-- Functions
DROP FUNCTION IF EXISTS check_duplicate_incident(UUID, UUID, TEXT, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS verify_hsse_manager_access(UUID, UUID);

-- Extension (only if no other features use it)
DROP EXTENSION IF EXISTS pg_trgm;

-- Index
DROP INDEX IF EXISTS idx_incidents_title_trgm;

-- Cron jobs
SELECT cron.unschedule('hsse-sla-check');
SELECT cron.unschedule('hsse-monitoring-termination');
SELECT cron.unschedule('hsse-evidence-purge');
```

