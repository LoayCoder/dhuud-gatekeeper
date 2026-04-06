

# Contractor Portal Gate Passes — E2E Audit & Fixes

## Issues Found

### 1. **No Detail View** (Critical Gap)
The gate passes table rows are not clickable. There is no `GatePassDetailDialog` integration — unlike admin pages (`PendingApprovals.tsx`, `GatePassApprovalQueue.tsx`) which all use it. Users cannot view pass details, approval timeline, items, or photos.

### 2. **No Error State** (Silent Failure)
`useContractorGatePasses` returns `{ data }` but the page never destructures `isError` or `isLoading` from the gate passes query. If the query fails, the page shows "No gate passes" — misleading.

### 3. **Missing Status: `expired`** (Data Gap)
`getStatusBadge` handles 7 statuses but omits `expired` — a valid lifecycle status. Expired passes render as raw text with no icon or color.

### 4. **No Status Filter** (Feature Gap)
Only a text search exists. No dropdown to filter by status (pending, approved, rejected, expired). The admin-side `GatePassListTable` has full filtering — the portal does not.

### 5. **No Project Column** (Data Gap)
The query fetches `project:contractor_projects(project_name)` but the table doesn't display it. Users can't tell which project a pass belongs to.

### 6. **No Material Description Column**
The most important field — what materials are being moved — is not shown in the table.

### 7. **Missing `isLoading` for Gate Passes Query**
The page shows a loader for `useContractorPortalData` loading, but once that resolves, the gate passes query fires separately. There's a flash of "No gate passes" before data arrives.

### 8. **No Photo Gate Enforcement on Form** (Per Test Case 18)
`GatePassFormDialog` does not check worker `photo_verified_at`. However, gate passes are material passes (not worker passes) — they track materials/vehicles, not worker entry. **Photo gate enforcement is not applicable here** — it applies to worker onboarding, not material gate passes. This test case is N/A.

## Plan

### File: `src/pages/contractor-portal/GatePasses.tsx`

| Change | Detail |
|--------|--------|
| Add detail dialog | Import `GatePassDetailDialog`, add `selectedPass` state, make rows clickable |
| Add error state | Destructure `isError`/`isLoading` from gate passes query, show error card |
| Add loading state for passes | Show skeleton while gate passes query is loading |
| Add status filter | Add a Select dropdown to filter by status |
| Add `expired` status badge | Add case for `expired` with gray styling |
| Add Project & Material columns | Show project name and material description in table |

### File: `src/features/contractors/hooks/use-contractor-portal.ts`

| Change | Detail |
|--------|--------|
| Expand gate passes select | Add `material_description`, `is_internal_request`, `requested_by`, `rejection_reason` to enable detail dialog |

### Summary
- 2 files modified
- No new files, no DB changes
- Fixes: 1 silent failure, 1 missing detail view, 1 missing status, 3 missing columns, 1 missing filter

