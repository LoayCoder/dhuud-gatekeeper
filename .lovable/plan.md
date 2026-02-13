

## Fix: Recent Events Not Responding to Dashboard Branch Filter

### Root Cause

The `RecentEventsCard` component uses the `useRecentEvents` hook, which internally reads from `useBranchFilter()` -- the **global** branch context. However, the dashboard now manages its own **local** `branchId` state via the unified Year/Month/Branch filter bar. The `RecentEventsCard` never receives the dashboard's local filter, so it always shows events based on the global branch selector instead.

All other dashboard widgets were updated to use the dashboard's local `startDate`, `endDate`, and `branchId`, but `RecentEventsCard` was missed.

### Fix

1. **`useRecentEvents` hook** -- Add optional `branchId` and `startDate`/`endDate` parameters. When provided, use these instead of the global `useBranchFilter()`.

2. **`RecentEventsCard` component** -- Accept `branchId`, `startDate`, and `endDate` as props and pass them to `useRecentEvents`.

3. **`HSSEEventDashboard.tsx`** -- Pass the dashboard's local `activeBranchId`, `startDate`, and `endDate` to `RecentEventsCard`.

### Files Modified

- `src/hooks/use-recent-events.ts` -- Accept optional override params for branch and date range
- `src/components/incidents/dashboard/RecentEventsCard.tsx` -- Accept and forward filter props
- `src/pages/incidents/HSSEEventDashboard.tsx` -- Pass local filter state to `RecentEventsCard`

### Technical Detail

The hook signature changes from:
```
useRecentEvents(limit)
```
to:
```
useRecentEvents(limit, { branchId?, startDate?, endDate? })
```

When `branchId` is provided, it overrides the global `useBranchFilter()`. The date range filters events by `occurred_at` (or `created_at`) to match the dashboard's Year/Month selection. This ensures **zero global data leakage** -- Recent Events will show exactly what matches the dashboard filters.

