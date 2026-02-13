

## Fix: Cross-Branch Analytics Must Ignore Branch Filter

### Problem
The `CrossBranchAnalytics` component currently receives `branchId={branchId || undefined}` from the dashboard, causing it to filter by the selected branch. Cross-branch analysis is inherently multi-branch, so filtering by a single branch defeats its purpose.

### Change
**One file, one line change:**

**`src/pages/incidents/HSSEEventDashboard.tsx` (line 793)**
- Remove `branchId={branchId || undefined}` from the `CrossBranchAnalytics` component props.

### What stays the same
- `CrossBranchSummaryCard` -- already ignores branch filter (no `branchId` prop)
- `CrossBranchHeatmap` -- already ignores branch filter (no `branchId` prop)
- Year/Month filters (`startDate`, `endDate`) continue to apply to all three components
- Tenant isolation is enforced by the `useCrossBranchAnalytics` hook via `profile.tenant_id`
- All other dashboard sections continue to respect the branch filter normally

### Result
| Filter | Effect on Cross-Branch Analytics |
|--------|----------------------------------|
| Branch | Ignored |
| Year | Applied |
| Month | Applied |
| Tenant | Always enforced |

