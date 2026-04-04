

# Remaining Fix: Worker Management Mutations Missing `.throwOnError()`

## Status of Previous Fixes

| Fix | Status |
|-----|--------|
| `.throwOnError()` on company mutations | ✅ Already done |
| `.throwOnError()` on personnel sync | ✅ Already done |
| RLS policies → `assigned_branch_id` (companies) | ✅ Already done |
| RLS policies → `assigned_branch_id` (workers) | ✅ Already done |
| CompanyFormDialog try/catch | ✅ Already done |
| **Worker management mutations `.throwOnError()`** | ❌ **Not done** |

## What Remains

**File:** `src/features/contractors/hooks/use-contractor-workers/use-worker-management-mutations.ts`

5 mutations still use the old `if (error) throw error` pattern instead of `.throwOnError()`:

1. **`useRejectWorker`** (lines 29-34) — worker info SELECT missing `.throwOnError()`, update missing `.throwOnError()`
2. **`useBulkApproveWorkers`** (lines 86-90) — update+select missing `.throwOnError()`
3. **`useBulkRejectWorkers`** (lines 112-116) — update+select missing `.throwOnError()`
4. **`useDeleteContractorWorker`** (lines 138-141) — update missing `.throwOnError()`
5. **`useUpdateWorkerStatus`** (lines 184-189) — update+select missing `.throwOnError()`

## Plan

### Step 1: Add `.throwOnError()` to all 5 worker mutations

Replace the `if (error) throw error` pattern with `.throwOnError()` on every Supabase chain in this file. Remove the now-redundant `error` destructuring and manual throw.

No other files need changes — the rest of the audit is clean.

