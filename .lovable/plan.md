

# Fix: Inspection Dashboard Showing All Zeros

## Root Cause

The inspection dashboard hooks (`useInspectionSessionStats`, `useComplianceTrend`, `useFindingsDistribution`, `useOverdueInspectionsCount`, `useRecentFindings`) have **two implementations**:

1. **Stubs** in `src/features/incidents/hooks/use-inspection-stubs.ts` — return hardcoded zeros/empty arrays
2. **Real implementations** in `src/features/incidents/hooks/use-inspection-dashboard.ts` — call actual RPCs

The barrel file `src/features/incidents/index.ts` exports stubs on line 202 (`export * from './hooks/use-inspection-stubs'`) but **never overrides them** with the real dashboard hooks. The dashboard page imports from `@/features/incidents`, so it gets the stubs.

Database has 3 real sessions (2 in_progress, 1 completed_with_open_actions) but the UI shows zeros because the stubs never query the database.

## Fix

**File: `src/features/incidents/index.ts`**

Add explicit re-exports of the real dashboard hooks after line 274, following the same override pattern used for other hooks:

```typescript
// Override stub dashboard hooks with real implementations
export {
  useInspectionSessionStats,
  useComplianceTrend,
  useFindingsDistribution,
  useOverdueInspectionsCount,
  useRecentFindings,
} from './hooks/use-inspection-dashboard';
```

This overrides the stub exports with the real RPC-backed implementations — same pattern already used for `useSessionActions`, `useMyInspectionActions`, etc.

## Files Changed
1. `src/features/incidents/index.ts` — add 7 lines to re-export real dashboard hooks

No database changes, no new files needed.

