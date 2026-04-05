

# Complete the Document Controller Edit Re-Approval Workflow

## Problem

The database trigger (`track_contractor_worker_edits`) correctly sets `edit_pending_approval = true` when a contractor rep edits an approved worker. However, the **admin-facing side is incomplete**:

1. The admin worker query does NOT select `edit_pending_approval`, `edited_by`, or `edited_at`
2. The `ContractorWorker` type does NOT include these fields
3. There is NO mutation to clear `edit_pending_approval` (approve edits)
4. There is NO dedicated "Pending Edits" filter or review action for Document Controllers
5. The admin update mutation does NOT reset the flag when a Document Controller edits directly

## Changes

### 1. Add edit tracking fields to ContractorWorker type
**File:** `src/features/contractors/hooks/use-contractor-workers/types.ts`

Add `edit_pending_approval`, `edited_by`, and `edited_at` fields to the `ContractorWorker` interface.

### 2. Include edit fields in admin worker query
**File:** `src/features/contractors/hooks/use-contractor-workers/use-contractor-worker-queries.ts`

Add `edit_pending_approval, edited_by, edited_at` to the select clause in `useContractorWorkers`.

### 3. Create "Approve Edits" mutation
**File:** `src/features/contractors/hooks/use-contractor-workers/use-worker-management-mutations.ts`

Add a `useApproveWorkerEdits` mutation that:
- Checks `has_document_controller_access` before proceeding
- Sets `edit_pending_approval = false` on the worker
- Logs to audit trail
- Invalidates relevant queries

Export it from the barrel file (`index.ts`).

### 4. Add "Approve Edits" action to admin WorkerActionsDropdown
**File:** `src/features/contractors/components/WorkerActionsDropdown.tsx` (or wherever the dropdown is)

Add an "Approve Edits" menu item visible only to Document Controllers when `edit_pending_approval === true`. Calls `useApproveWorkerEdits`.

### 5. Clear edit flag when Document Controller edits directly
**File:** `src/features/contractors/hooks/use-update-contractor-worker.ts`

After a successful update by a Document Controller, also set `edit_pending_approval = false` (since the DC is the authority, their own edits don't need re-approval — the DB trigger already handles this, but confirm).

### 6. Add "Pending Edits" status filter option on admin workers page
Add a filter option on the admin `/contractors/workers` page so Document Controllers can filter to see only workers with `edit_pending_approval = true`.

## Technical Details

- The DB trigger already skips flagging when the editor is a Document Controller or Admin — so DC direct edits won't set the flag
- The "Approve Edits" mutation only needs to update `edit_pending_approval = false` and audit log it
- RLS already allows Document Controllers to update worker records

