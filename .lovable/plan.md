

# Fix: App "Failed to Load" + User Management "No data available"

## Diagnosis

The app is showing "Failed to Load Application" — a Vite dev server cache issue. TypeScript compilation passes with zero errors. The Vite cache was already cleared. A version bump will force a full module reload.

The User Management "No data available" question can only be verified once the app actually loads. The data layer code (`use-users-paginated.ts`) and the RPC `get_users_with_roles_paginated` are correctly wired.

## Plan

### Step 1: Force app rebuild
- Bump version comment in `src/App.tsx` line 1 from `v6` to `v7`
- This triggers a full HMR cascade since the root component changes

### Step 2: Verify app loads
Once the app loads, navigate to User Management and check if data appears. If it still shows "No data available", inspect the RPC response in the network tab.

### Step 3 (if needed): Debug data layer
If data is still missing after app loads, check:
- Whether `get_users_with_roles_paginated` RPC returns results
- Whether the `useUserManagementData` hook is using the correct import path (it imports from `@/hooks/use-users-paginated` while there's a duplicate at `src/features/users/hooks/use-users-paginated.ts`)

## Files to change
| File | Change |
|------|--------|
| `src/App.tsx` line 1 | Bump `v6` → `v7` |

