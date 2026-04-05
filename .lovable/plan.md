

# Integrate Blacklist Checks into Contractor Portal Workers Page

## Problem
The Contractor Portal (`/contractor-portal/workers`) has no blacklist integration. A contractor representative can submit workers who are on the security blacklist without any warning. The admin-facing `/contractors/workers` page already has full integration.

## Changes

### 1. Add blacklist lookup to Contractor Portal Workers page
**File:** `src/pages/contractor-portal/Workers.tsx`

- Import `useBlacklistNationalIds` from `@/features/security`
- Query blacklisted national IDs for the tenant
- Pass `blacklistedIds` set to the worker list/table component
- Show a destructive badge or alert on blacklisted workers
- Disable "Add Worker" submission if the entered national ID is blacklisted (with a clear warning message)

### 2. Add blacklist check to worker creation form (Contractor Portal)
**File:** The contractor portal's add worker form component

- Before submission, check if the worker's `national_id` exists in the blacklist set
- If blacklisted, show an inline error: "This worker is on the security blacklist and cannot be added"
- Block form submission for blacklisted national IDs

### 3. Show blacklist status in worker list
**File:** The contractor portal's worker list/table component

- Add a visual indicator (destructive badge with shield icon) for any worker whose `national_id` is in the blacklist
- Show tooltip with "This worker is on the security blacklist"

### What this does NOT do
- Contractor reps cannot add/remove from blacklist (that remains a security/admin action)
- Contractor reps only see that a worker is blacklisted, not the reason (security-sensitive)

## Files to modify
| File | Change |
|------|--------|
| `src/pages/contractor-portal/Workers.tsx` | Import `useBlacklistNationalIds`, pass to child components |
| Contractor portal worker list component | Add blacklist badge indicators |
| Contractor portal add worker form | Add pre-submission blacklist check with error message |

