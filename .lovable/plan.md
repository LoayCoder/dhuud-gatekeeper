

# Plan: Bring All 5 Features to 10/10

## Gaps Identified

| Feature | Gap | Severity |
|---------|-----|----------|
| C11 | `investigation_started_at` is never set when status transitions to `investigation_in_progress` -- SLA check finds 0 rows | Critical |
| C11 | pg_cron job not registered -- edge function never runs automatically | Critical |
| C12 | pg_cron job not registered | Critical |
| C13 | pg_cron job not registered | Critical |
| C13 | No batch limit -- could timeout on large datasets | Medium |
| C16 | No frontend integration -- RPC exists but nothing calls it before incident creation | Medium |
| C18 | Only checks `hsse_manager` role code, not `hsse_director` or other roles in `hsse_management` category | Low |
| C11 | No backfill of `investigation_started_at` for existing incidents already in `investigation_in_progress` | Medium |

---

## Changes

### 1. Database Migration -- Auto-populate triggers + backfill

Create a migration that:

**a) Trigger: auto-set `investigation_started_at`** when status changes to `investigation_in_progress`:

```text
CREATE OR REPLACE FUNCTION set_investigation_started_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'investigation_in_progress'
     AND (OLD.status IS DISTINCT FROM 'investigation_in_progress')
     AND NEW.investigation_started_at IS NULL THEN
    NEW.investigation_started_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_investigation_started_at
  BEFORE UPDATE ON incidents
  FOR EACH ROW
  EXECUTE FUNCTION set_investigation_started_at();
```

**b) Backfill** existing incidents in `investigation_in_progress` that have null `investigation_started_at`:

```text
UPDATE incidents
SET investigation_started_at = COALESCE(
  (SELECT MIN(created_at) FROM incident_audit_logs
   WHERE incident_id = incidents.id
     AND action IN ('status_changed', 'investigation_assigned')),
  updated_at, created_at
)
WHERE status = 'investigation_in_progress'
  AND investigation_started_at IS NULL
  AND deleted_at IS NULL;
```

**c) Upgrade C18** to check all roles in the `hsse_management` category by joining to `role_categories`:

```text
DROP FUNCTION IF EXISTS verify_hsse_manager_access(UUID, UUID);

CREATE OR REPLACE FUNCTION verify_hsse_manager_access(...)
-- Now checks: r.code = ANY(rc.roles) where rc.category_name = 'hsse_management'
-- Falls back to direct r.code = 'hsse_manager' if no role_categories row exists
```

### 2. Frontend Hook -- `use-duplicate-check.ts` (C16 integration)

New hook that calls the `check_duplicate_incident` RPC:

```text
export function useDuplicateCheck() {
  return useMutation({
    mutationFn: async ({ tenantId, departmentId, title, occurredAt }) => {
      const { data } = await supabase.rpc('check_duplicate_incident', {
        p_tenant_id: tenantId,
        p_department_id: departmentId,
        p_title: title,
        p_occurred_at: occurredAt,
      });
      return data || [];
    }
  });
}
```

### 3. Frontend UI -- Duplicate Warning Dialog

Add to the incident creation form (before submit):
- Call `checkDuplicate` mutation with form values
- If results returned, show an AlertDialog listing potential duplicates with reference IDs, titles, and similarity scores
- User can "Proceed Anyway" or "Cancel"

### 4. Set `investigation_started_at` in workflow hook

In `src/hooks/use-hsse-workflow.ts` line 648, add `investigation_started_at`:

```text
.update({
  status: 'investigation_in_progress',
  investigation_started_at: new Date().toISOString()
})
```

Also update `src/hooks/use-incident-closure.ts` line 341 and `src/hooks/use-dispute-resolution.ts` lines 155/159 where the same transition occurs.

### 5. Edge Function -- Add batch limit to C13

Update `handleEvidencePurge` to process max 100 records per table per run:

```text
.lt('created_at', retentionCutoff)
.limit(100)
```

Add a `has_more` flag in the response so the scheduler knows to re-invoke.

### 6. Register pg_cron jobs (via data insert tool)

Three `cron.schedule()` calls using `net.http_post`:

- `hsse-sla-check`: hourly (`0 * * * *`) with `?job=sla_check`
- `hsse-monitoring-termination`: daily 6AM (`0 6 * * *`) with `?job=monitoring_termination`
- `hsse-evidence-purge`: weekly Sunday 3AM (`0 3 * * 0`) with `?job=evidence_purge`

---

## File Summary

| # | File | Action | Purpose |
|---|------|--------|---------|
| 1 | Migration SQL | New | Trigger for `investigation_started_at`, backfill, upgraded C18 RPC |
| 2 | `src/hooks/use-duplicate-check.ts` | New | C16 frontend hook |
| 3 | `src/components/incidents/DuplicateWarningDialog.tsx` | New | C16 warning UI |
| 4 | `src/hooks/use-hsse-workflow.ts` | Edit | Set `investigation_started_at` on status transition |
| 5 | `src/hooks/use-incident-closure.ts` | Edit | Set `investigation_started_at` on reopen to investigation |
| 6 | `src/hooks/use-dispute-resolution.ts` | Edit | Set `investigation_started_at` on dispute resolution |
| 7 | `supabase/functions/hsse-cron/index.ts` | Edit | Add batch limit (100) to evidence purge |
| 8 | pg_cron SQL (data insert) | Insert | Register 3 cron schedules |
| 9 | Incident creation form | Edit | Wire duplicate check before submit |

