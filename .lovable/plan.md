

## Fix: Duplicate Branch Names in Dropdown (Defensive Deduplication)

### Root Cause

The database only has **one** active "RGC" branch (the old one was soft-deleted on 2025-12-29). The duplicate showing in the UI is caused by **stale React Query cache** in the browser. A hard refresh (Ctrl+Shift+R) will immediately fix it.

### Preventive Fix

Add deduplication by `id` to the branch query results in **3 locations** to ensure this never happens again, even with stale caches:

### File Changes

**1. `src/contexts/BranchContext.tsx`**
- After fetching `allBranches` (line 78), deduplicate by `id` before setting state:
```ts
const uniqueBranches = allBranches?.filter(
  (b, i, arr) => arr.findIndex(x => x.id === b.id) === i
) || [];
setAccessibleBranches(uniqueBranches);
```
- Same dedup for the assignments-based branch list (line 138)

**2. `src/hooks/use-org-hierarchy.ts` (`useTenantBranches`)**
- Deduplicate query results before returning

**3. `src/hooks/use-branches.ts`**
- Deduplicate query results before returning

### Also Fix: Build Errors (unrelated but blocking)

**4. `src/hooks/use-push-subscription.ts`** (lines 207, 292)
- Add type assertion for `pushManager` property: `(registration as any).pushManager`

**5. `src/pages/public-gate-pass/PublicStatusPage.tsx`** (line 454)
- Fix undefined `isCompleted` variable -- derive it from the status data

### Immediate Action for User

Hard refresh the browser (Ctrl+Shift+R) to clear the stale cache and see only one RGC immediately.

