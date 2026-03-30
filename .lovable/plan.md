

# Deep End-to-End Audit & Remediation — Inspection Module (Round 3)

## Summary

After three prior audit rounds that addressed the most critical issues (tenant_id filters, duplicate hooks, lifecycle count bugs, access control, polling optimization), this fourth-pass audit focuses on remaining gaps found through full dependency tracing. The module is now in substantially better shape — the issues below are narrower in scope.

---

## Issues Found

### HIGH

#### H1: `useCompleteSession` Parts Summary Query Missing `deleted_at` Filter
**File:** `use-session-lifecycle-mutations.ts` line 300-303

The secondary query fetching session asset IDs for part-level aggregation lacks `.is('deleted_at', null)`, meaning soft-deleted session assets inflate the parts summary stored in `ai_summary`.

```typescript
// Current (line 300-303)
const { data: sessionAssetIds } = await supabase
    .from('inspection_session_assets')
    .select('id')
    .eq('session_id', sessionId);
// Missing: .is('deleted_at', null)
```

**Fix:** Add `.is('deleted_at', null)` to this query.

#### H2: `useStartSession` Uses `as any` for Snapshot Extraction (4 instances)
**File:** `use-session-lifecycle-mutations.ts` lines 92-93, 172-173

Both asset-mode code paths extract `building.name` and `type.name` via `(asset.building as any)?.name`. The Supabase select returns these as nested objects, but TypeScript doesn't know the shape.

**Fix:** Add inline type assertions:
```typescript
asset_location_snapshot: (asset.building as { name: string } | null)?.name || null,
asset_type_snapshot: (asset.type as { name: string } | null)?.name || null,
```

#### H3: `useSessionProgress` Polls Unconditionally at 5s
**File:** `use-inspection-session-queries.ts` line 214

The hook has `refetchInterval: 5000` without checking session status. It should only poll during `in_progress`.

**Fix:** Accept optional `sessionStatus` parameter and use `refetchInterval: sessionStatus === 'in_progress' ? 5000 : false`.

---

### MEDIUM

#### M1: Stub File Still Exports Competing Hooks
**File:** `use-inspection-stubs.ts` exports ~40 hooks that shadow canonical implementations. While the barrel file (`features/incidents/index.ts`) re-exports canonical hooks *after* stubs (lines 204-258), the stubs still create confusion:
- `useMyInspectionActions` (stub line 186) returns empty array — but the real one is in `use-action-queries.ts`
- `useSessionActions` (stub line 315) returns empty array — real one in `use-action-queries.ts`
- `useVerifyAction` (stub line 282) is a no-op — real one in `use-action-mutations.ts`
- `useUpdateInspectionActionStatus` (stub line 596) is a no-op — real one in `use-action-mutations.ts`
- `useCreateActionFromFinding` (stub line 621) is a no-op — real one in `use-action-mutations.ts`

The barrel does NOT override these inspection-action hooks because the override section (lines 204-258) only covers `use-inspections` and `use-inspection-sessions` hooks.

**Impact:** Any component importing `useMyInspectionActions`, `useSessionActions`, `useVerifyAction`, `useUpdateInspectionActionStatus`, or `useCreateActionFromFinding` from `@/features/incidents` will get the **stub** (empty/no-op) instead of the real implementation — unless they import directly from the action hooks file.

**Fix:** Add explicit re-exports for all inspection-action hooks in `features/incidents/index.ts` after the stubs line:
```typescript
export {
  useSessionActions,
  useMyInspectionActions,
} from './hooks/use-inspection-actions/use-action-queries';
export {
  useCreateActionFromFinding,
  useVerifyAction,
  useUpdateActionStatus,
  useUpdateInspectionActionStatus,
} from './hooks/use-inspection-actions/use-action-mutations';
export {
  useCreateSessionAction,
} from './hooks/use-inspection-actions/use-create-session-action';
export {
  useSessionFailedAssets,
} from './hooks/use-inspection-actions/use-session-failed-assets';
```

#### M2: `useInspectionSchedules` Missing `tenant_id` Filter
**File:** `use-schedule-queries.ts` line 12-43

The schedules query filters by `deleted_at` but doesn't explicitly filter by `tenant_id`. Defense-in-depth requires it.

**Fix:** Add `.eq('tenant_id', profile.tenant_id)` to the query.

#### M3: `useInspectionTemplateCategories` Missing `tenant_id` Filter
**File:** `use-inspection-categories.ts` line 30-35

Categories query lacks explicit tenant filter.

**Fix:** Add `.or(`tenant_id.eq.${profile.tenant_id},tenant_id.is.null`)` to include system categories + tenant-specific ones.

#### M4: `useInspectionTemplates` Missing `tenant_id` Filter
**File:** `use-inspection-template-hooks.ts` line 18-43

Templates query has no `tenant_id` filter. This is a defense-in-depth gap.

**Fix:** Add `.eq('tenant_id', profile.tenant_id)`.

#### M5: `useAddAssetToSession` Missing `deleted_at` on Existing Check
**File:** `use-session-asset-mutations.ts` lines 114-119

The duplicate-check query doesn't exclude soft-deleted session assets, so re-adding a previously deleted asset would fail.

**Fix:** Add `.is('deleted_at', null)` to the existing-check query.

---

### LOW

#### L1: `useInspectionSchedules` Uses `as never` Cast
**File:** `use-schedule-queries.ts` line 12 — `from('inspection_schedules' as never)`

This indicates the table isn't in generated types yet. Functional but fragile.

#### L2: `staleTime: 0, gcTime: 0` on Templates Query
**File:** `use-inspection-template-hooks.ts` lines 46-47

Disabling all caching defeats React Query's purpose. This was added as a hotfix but should be revisited.

#### L3: Import Statement at EOF
**File:** `use-session-lifecycle-mutations.ts` line 424

`import type { RecordInspectionInput } from './types';` is at the end of the file instead of the top. Non-standard.

---

## Verified Working Correctly

| Area | Status |
|------|--------|
| Session creation (two-step draft + start) | ✅ |
| Asset-mode execution with snapshots | ✅ |
| Area-mode checklist responses | ✅ |
| `useCompleteAreaSession` failure detection | ✅ |
| `useCompleteSession` count pattern (fixed in prior audit) | ✅ |
| `canVerifyActions` role restriction | ✅ |
| `useSessionProgress` tenant_id + deleted_at | ✅ |
| `useSessionAssets` tenant_id + deleted_at | ✅ |
| `useAreaInspectionResponses` deleted_at | ✅ |
| `useAreaChecklistProgress` conditional polling | ✅ |
| `useCanCloseSession` conditional polling | ✅ |
| Soft delete via SECURITY DEFINER RPC | ✅ |
| Session sync-back with deleted_at filter | ✅ |
| Corrective action creation with failure snapshot | ✅ |
| Offline area inspection queue | ✅ |
| Schedule CRUD with soft deletes | ✅ |
| Categories CRUD with soft deletes | ✅ |
| Template CRUD with full hierarchy | ✅ |
| Export dropdown | ✅ |
| QR scanner asset lookup with deleted_at | ✅ |
| Post-confirm lock + auto-advance | ✅ |
| Critical fail blocks partial option | ✅ |

---

## File Change Summary

| # | File | Changes |
|---|------|---------|
| 1 | `use-session-lifecycle-mutations.ts` | Add `deleted_at` filter to parts summary query (line 300); fix `as any` to typed assertions (lines 92-93, 172-173); move import to top |
| 2 | `use-inspection-session-queries.ts` | Make `useSessionProgress` polling conditional on session status |
| 3 | `features/incidents/index.ts` | Add explicit re-exports for all inspection-action hooks to override stubs |
| 4 | `use-schedule-queries.ts` | Add `tenant_id` filter to `useInspectionSchedules` |
| 5 | `use-inspection-categories.ts` | Add tenant scoping to categories query |
| 6 | `use-inspection-template-hooks.ts` | Add `tenant_id` filter to templates query |
| 7 | `use-session-asset-mutations.ts` | Add `deleted_at` filter to duplicate-check in `useAddAssetToSession` |

