

# Fix: Remove Invalid Column References on `project_worker_assignments`

## Problem
The `project_worker_assignments` table has these columns: `id, tenant_id, project_id, worker_id, assigned_at, removed_at, removal_reason, is_active, created_by, created_at, updated_at, deleted_at`.

Two files reference columns that **do not exist**:

1. **`src/features/contractors/hooks/use-contractor-portal.ts` (line 283)**: Inserts `status: "active"` — no `status` column exists. This is the direct cause of the runtime error.
2. **`supabase/functions/revoke-worker-access/index.ts` (lines 103, 123)**: Updates `removed_by: user.id` — no `removed_by` column exists. This silently fails on worker access revocation.

## Fix

### 1. `use-contractor-portal.ts` — Remove `status` from insert
Remove `status: "active"` from the `project_worker_assignments` insert at line 283. The table uses `is_active` (which defaults to `true`), so no replacement is needed.

### 2. `revoke-worker-access/index.ts` — Remove `removed_by` from update
Remove `removed_by: user.id` from both update calls (lines 103 and 123). The table has no `removed_by` column — only `removal_reason` and `removed_at`.

## Summary

| File | Line(s) | Bad Column | Fix |
|------|---------|------------|-----|
| `use-contractor-portal.ts` | 283 | `status` | Remove from insert |
| `revoke-worker-access/index.ts` | 103, 123 | `removed_by` | Remove from update |

Two file edits, no database migration needed.

