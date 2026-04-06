

# Fix Workers Page: Branch Filter, Status Change, and Responsive Card Layout

## Problems Identified

1. **Branch filter not applied**: `useContractorWorkers` imports `useBranchFilter` but never applies it to the query. Workers from all branches show regardless of the selected branch (e.g., "DGC" in the header).

2. **Change Status not functional**: The `ChangeWorkerStatusDialog` opens and the mutation fires, but the `useUpdateWorkerStatus` mutation does NOT include `approved_by` when approving, and does NOT handle `suspended` status. More critically, the dialog's `onConfirm` prop passes `(status, reason)` but the mutation key uses `workerId` from `workerToChangeStatus` — this chain is correct but the mutation lacks `.throwOnError()` which means RLS failures are silently swallowed.

3. **Table layout not responsive**: The current `WorkerListTable` uses a traditional `<Table>` with 10+ columns, which is unusable on smaller screens. Needs expandable card layout.

## Changes

### 1. Apply branch filter in worker query
**File:** `src/features/contractors/hooks/use-contractor-workers/use-contractor-worker-queries.ts`

In `useContractorWorkers`, after `useBranchFilter()`, apply the branch filter to the query using the company's `assigned_branch_id`:
- Destructure `branchIds` and `isAllBranchesMode` from `useBranchFilter()`
- If not in all-branches mode and branchIds exist, filter workers by joining through `contractor_companies.assigned_branch_id` using `.in()` on the company relation, OR filter directly on a sub-select
- Since `contractor_workers` doesn't have a direct `branch_id`, filter via the company's `assigned_branch_id`: fetch company IDs matching the branch first, then filter workers by those company IDs. Alternatively, use an RPC or inline filter on the joined company data post-fetch.

The pragmatic approach: after fetching, client-side filter workers whose `company.assigned_branch_id` is in `branchIds`. This is simpler and the query already joins `contractor_companies(company_name, assigned_branch_id)`.

### 2. Fix Change Status mutation reliability
**File:** `src/features/contractors/hooks/use-contractor-workers/use-worker-management-mutations.ts`

In `useUpdateWorkerStatus`:
- Add `approved_by: user?.id` when status is `approved`
- Add handling for `suspended` status (set `rejection_reason`)
- The mutation already has `.throwOnError()` — good. But the `useAuth` hook is not imported in this function. Add `const { user } = useAuth();` and include `approved_by`.

### 3. Convert WorkerListTable to responsive card layout
**File:** `src/features/contractors/components/WorkerListTable.tsx`

Replace the `<Table>` with a responsive layout:
- On `md+` screens: keep the existing table view
- On smaller screens: render expandable cards showing key info (photo, name, company, status) with an expand button to reveal full details (national ID, nationality, induction, role, actions)
- Each card is a self-contained unit with avatar, name, company badge, status badge, and an actions dropdown
- Use `Collapsible` from shadcn for the expand/collapse behavior
- Maintain all existing props and selection checkboxes

### 4. Add branch filter dropdown to Workers page filters
**File:** `src/pages/contractors/Workers.tsx`

- Import `useBranchFilter` and add a Branch filter `<Select>` alongside the existing Company and Status filters
- This provides explicit branch filtering in the UI, complementing the global branch selector in the header

## Technical Details

- Branch filtering uses `company.assigned_branch_id` per the memory note about contractor data integrity
- The responsive card layout uses Tailwind's `hidden md:block` / `block md:hidden` pattern
- RTL-compatible using logical properties (`ms-`, `me-`, `text-start`, `text-end`)
- All existing functionality (selection, bulk actions, blacklist indicators) preserved in both views

## Files to Modify

| File | Change |
|------|--------|
| `use-contractor-worker-queries.ts` | Apply branch filter to worker results |
| `use-worker-management-mutations.ts` | Add `approved_by`, import `useAuth` |
| `WorkerListTable.tsx` | Add responsive card layout with expand/collapse |
| `Workers.tsx` | Minor: no branch dropdown needed since header selector works once query is fixed |

