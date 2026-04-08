

# Fix: Worker Approval "start_date" Trigger Error

## Root Cause

Two duplicate triggers on `contractor_workers` — `enforce_contractor_access_duration_trigger` and `trg_enforce_contractor_access_duration` — both fire on UPDATE and reference `NEW.start_date` and `NEW.end_date`. These columns do **not exist** on the `contractor_workers` table.

When the security approval sets `approval_status = 'approved'`, the trigger fires and crashes with: `record "new" has no field "start_date"`.

## Fix (Single Migration)

Drop both broken triggers and recreate a single, corrected trigger that uses columns that actually exist on the table. Based on the project's access-duration logic, the trigger should set `approved_at` (already handled by the mutation) and optionally compute an `access_expiry_date` if that column exists — or simply be a no-op if access duration is tracked elsewhere (e.g., `project_worker_assignments`).

### Migration SQL

```sql
-- Drop both duplicate broken triggers
DROP TRIGGER IF EXISTS enforce_contractor_access_duration_trigger ON public.contractor_workers;
DROP TRIGGER IF EXISTS trg_enforce_contractor_access_duration ON public.contractor_workers;

-- Drop the broken function
DROP FUNCTION IF EXISTS public.enforce_contractor_access_duration();
```

This removes the faulty triggers entirely. The approval mutations already set `approved_at` and `security_approved_at` timestamps in code, so no replacement trigger is needed.

If access duration enforcement is desired later, a new trigger can be added referencing actual columns.

## Files Changed

- **Database migration only** — no application code changes needed. The mutation code in `use-worker-approval-mutations.ts` is correct; it's the DB trigger that's broken.

## What This Fixes

1. Security approval of workers (the immediate error)
2. Stage 1 contractor approval (same trigger fires on `pending` → `pending_security` but doesn't crash because the condition checks for `approved` status — however it's still dead code)
3. Removes duplicate trigger (two triggers calling the same broken function)

## Expected Result

After the migration, approving "Ahmad Mohammed Al-Harbi" (or any worker) will succeed without errors. The full workflow — pending → pending_security → approved → induction sent → QR generated — will complete end-to-end.

