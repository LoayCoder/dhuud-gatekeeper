

# Add "Pending Edits" Tab with Badge Counter + Fix Runtime Error

## Problem
Document Controllers need a quick way to see how many workers have pending edit re-approvals. Currently, "Pending Edits" is only available as a status filter dropdown option buried in the "All Workers" tab. Additionally, there's a runtime error in `WorkerDetailDialog.tsx` where `worker.preferred_language` can be undefined.

## Changes

### 1. Add "Pending Edits" tab to the TabsList (alongside "All Workers", "Pending Approvals", "Security Approvals")
**File:** `src/pages/contractors/Workers.tsx`

- Add a new `TabsTrigger` for `"pending_edits"` with a `FileEdit` icon and a badge counter showing the count of workers with `edit_pending_approval === true`
- Compute `pendingEditsCount` from `allWorkers.filter(w => w.edit_pending_approval).length`
- Only show this tab when the user is a Document Controller (`permissions.isDocumentController`)
- Add a corresponding `TabsContent` that reuses the same `WorkerListTable` but pre-filtered to `edit_pending_approval === true` workers
- The existing "Pending Edits" option in the status filter dropdown can remain for convenience

### 2. Fix runtime error in WorkerDetailDialog
**File:** `src/features/contractors/components/WorkerDetailDialog.tsx`

- Line 476: Change `worker.preferred_language.toUpperCase()` to `worker.preferred_language?.toUpperCase()` (optional chaining) to prevent crash when `preferred_language` is undefined

## Technical Details
- The pending edits count is derived client-side from the already-fetched `allWorkers` query — no new database query needed
- Tab visibility is gated by `permissions.isDocumentController` from the existing `useContractorRepPermissions` hook
- The tab content reuses `WorkerListTable` with the same props pattern as the "All Workers" tab

