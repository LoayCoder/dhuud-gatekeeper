

# Contractor Portal E2E Review: Critical Issues Found

## Critical Bug Discovered

**All 4 portal pages (Dashboard, Workers, Projects, Gate Passes) import from a STUB module** (`src/hooks/contractor-management/index.ts`) that returns hardcoded empty data:

```typescript
// This is what all pages currently use:
export function useContractorPortalData() {
  return { data: null, isLoading: false, company: null, projects: [] as ContractorProject[], workers: [] as ContractorWorker[] };
}

export function useContractorGatePasses(companyId?: string) {
  return useQuery({ queryFn: async () => [] as GatePass[], ... });
}
```

The **real implementation** exists at `src/features/contractors/hooks/use-contractor-portal.ts` with proper Supabase queries, but no page uses it.

## Additional Issues Found

1. **No contractor rep has `user_id` linked** — all `contractor_representatives` records have `user_id = NULL`, meaning even after fixing the import, the `useContractorRepresentative()` hook (which queries by `user_id`) will return `null` for all reps. The invitation flow that links `user_id` has not been used yet.

2. **islam@gbrksa.com** rep record exists but has no `user_id` linked — portal won't show their company data even with correct hooks.

## Fix Plan

### Step 1: Fix the stub module to re-export real hooks

**File:** `src/hooks/contractor-management/index.ts`

Replace the stub functions with re-exports from the real implementation:

```typescript
export {
  useContractorPortalData,
  useContractorGatePasses,
  useContractorRepresentative,
  useContractorPortalCreateWorker as useCreateContractorWorker,
} from "@/features/contractors/hooks/use-contractor-portal";

// Keep the InductionVideo type/hook if needed elsewhere
export { useInductionVideos } from "./use-induction-videos"; // or inline stub
```

This single change fixes all 4 pages (Dashboard, Workers, Projects, Gate Passes) plus Activity Log (which already uses the correct import).

### Step 2: Fix ContractorPortalRoute admin bypass

**File:** `src/components/access-control/ContractorPortalRoute.tsx`

Add `isAdmin` check alongside `isSuperAdmin` so admin accounts can review the portal:

```typescript
const { user, isAdmin } = useAuth();
// ...
if (isSuperAdmin || isAdmin) {
  return <>{children}</>;
}
```

### Step 3: Ensure `useContractorPortalData` works for admins

The `useContractorPortalData` hook chains from `useContractorRepresentative` (which queries by `user_id`). For admins who are NOT contractor reps, this returns `null` and no data loads.

Add a fallback: when the user is an admin and no rep record is found, allow selecting/viewing any company's data. Or, for the admin review scenario, provide a query parameter to specify which company to view.

**Simpler approach for now:** When admin accesses `/contractor-portal`, show all companies data or the first company, since the purpose is review access.

## Files Changed

| File | Change |
|------|--------|
| `src/hooks/contractor-management/index.ts` | Replace stubs with re-exports from real hooks |
| `src/components/access-control/ContractorPortalRoute.tsx` | Add `isAdmin` bypass |
| `src/features/contractors/hooks/use-contractor-portal.ts` | Add admin fallback in `useContractorPortalData` to load data without requiring a rep record |

## Expected Result After Fix

- Admin accounts can access all contractor portal pages
- Pages load real data from the database (projects, workers, gate passes, audit logs)
- Contractor representatives (once `user_id` is linked via invitation flow) will see only their company's data

