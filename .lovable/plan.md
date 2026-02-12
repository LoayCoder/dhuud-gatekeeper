

## Fix: Recent Events Card Ignoring Branch Filter

### Root Cause

The `useRecentEvents` hook does not wait for the branch context to finish loading before running its query. While the branch data is still loading, `isAllBranchesMode` defaults to a state that bypasses the branch filter, causing the query to fetch ALL events across all branches. This result gets cached by React Query, and subsequent branch changes may serve this stale cached data.

Other dashboard queries (like the RPC calls) correctly receive the branch ID as a parameter. But `useRecentEvents` relies entirely on the `useBranchFilter()` hook's reactive state, which can be in an indeterminate state during initial load.

### Fix

**File: `src/hooks/use-recent-events.ts`**

1. Import `isLoading` from `useBranchFilter()`
2. Add `!isLoading` to the `enabled` condition so the query waits for branch data before executing
3. This ensures `branchIds` and `isAllBranchesMode` have their correct values before the first query runs

```text
Line 21: Add isLoading to destructured values from useBranchFilter()
  Before: const { branchIds, isAllBranchesMode, queryKey: branchQueryKey } = useBranchFilter();
  After:  const { branchIds, isAllBranchesMode, isLoading: branchLoading, queryKey: branchQueryKey } = useBranchFilter();

Line 61: Gate the query on branch loading state
  Before: enabled: !!profile?.tenant_id,
  After:  enabled: !!profile?.tenant_id && !branchLoading,
```

### Why This Works

- The query will not fire until the branch context has resolved the user's branch assignments
- Once resolved, the correct `branchIds` and `isAllBranchesMode` values are used in the query
- The query key already includes `branchQueryKey`, so switching branches will correctly trigger a refetch with proper filter values
- When dgc branch is selected and has 0 events, the card will correctly show the "No Data" empty state

### Files Changed

- `src/hooks/use-recent-events.ts` (2 lines changed)

