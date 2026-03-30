

# Deep End-to-End Audit & Remediation Plan — Inspection Module

## Executive Summary

Full audit across 20+ files reveals **14 issues** (4 High, 6 Medium, 4 Low) spanning security gaps, duplicate implementations, lifecycle bugs, missing soft-delete filters, cache mismatches, and dead code. This plan provides exact fixes for each.

---

## Issues by Severity

### HIGH SEVERITY

#### H1: Duplicate `useCompleteAreaSession` — Two Competing Implementations
**Root cause:** Two separate files export the same hook name with different logic.
- `src/hooks/use-session-lifecycle.ts` — checks `area_inspection_responses` for `['non_conformance', 'observation', 'fail']`
- `src/hooks/use-area-inspections/use-area-inspection-mutations.ts` — checks `area_inspection_responses` for `['fail']` only

`AreaSessionWorkspace` imports from `use-session-lifecycle.ts`. The other is exported from the area-inspections barrel and used in tests.

**Fix:** Remove `useCompleteAreaSession` from `use-area-inspection-mutations.ts` and its barrel export. The `use-session-lifecycle.ts` version is canonical and already has the correct failure-detection logic. Update the test file to import from `use-session-lifecycle.ts`.

**Affected files:** `use-area-inspection-mutations.ts`, `use-area-inspections/index.ts`, `use-area-inspections.test.ts`

#### H2: Sync-Back Query Missing `deleted_at` + `tenant_id` Filters
**Root cause:** `useRecordAssetInspection` onSuccess sync-back (line 242) queries `inspection_session_assets` without `.is('deleted_at', null)` or `.eq('tenant_id', ...)`, inflating counters with soft-deleted records.

**Fix:** Add both filters to the sync-back query.

**Affected file:** `use-session-lifecycle-mutations.ts`

#### H3: `useCompleteSession` Missing `deleted_at` on Session Assets Count
**Root cause:** Line 299 counts failed session assets but doesn't exclude soft-deleted ones, potentially marking sessions as `completed_with_open_actions` when deleted assets had failures.

**Fix:** Already has `.is('deleted_at', null)` ✓ — verified this was fixed in the previous audit round.

#### H4: `canVerifyActions` Allows Any Authenticated User to Verify
**Root cause:** Both `AreaSessionWorkspace.tsx` (line 149) and `AuditSessionWorkspace.tsx` (line 77) set `canVerifyActions = !!profile`, meaning any logged-in user can verify/reject corrective actions.

**Fix:** Restrict to session inspector + HSSE roles:
```typescript
const canVerifyActions = !!profile && (
  session?.inspector_id === user?.id ||
  hasRole('hsse_officer') || hasRole('hsse_manager') || hasRole('admin')
);
```

**Affected files:** `AreaSessionWorkspace.tsx`, `AuditSessionWorkspace.tsx`

---

### MEDIUM SEVERITY

#### M1: `useAreaInspectionResponses` Missing `deleted_at` Filter
**Root cause:** Query at line 78-94 of `use-area-inspection-queries.ts` fetches all responses including soft-deleted ones. This affects area checklist rendering — deleted responses show up.

**Fix:** Add `.is('deleted_at', null)` to the query.

#### M2: `useSessionPartsProgress` Missing `deleted_at` on Session Assets Sub-query
**Root cause:** Line 23-26 of `use-session-parts-progress.ts` queries session assets without soft-delete filter, inflating expected part counts.

**Fix:** Add `.is('deleted_at', null)` to the session assets select.

#### M3: `useAreaChecklistProgress` Aggressive 2s Polling (Unconditional)
**Root cause:** Line 162 of `use-area-inspection-queries.ts` polls every 2 seconds regardless of session status.

**Fix:** Make polling conditional — accept session status parameter:
```typescript
refetchInterval: status === 'in_progress' ? 5000 : false
```

#### M4: `useSessionPartsProgress` 5s Polling (Unconditional)
**Root cause:** Line 106 polls regardless of session status.

**Fix:** Same conditional polling pattern.

#### M5: `useCanCloseSession` 10s Polling (Unconditional)
**Root cause:** Line 34 of `use-session-lifecycle.ts` polls even for closed sessions.

**Fix:** Conditional polling based on session status.

#### M6: Stubs File Exports Competing `useInspectionSessionStats`
**Root cause:** `use-inspection-stubs.ts` exports `useInspectionSessionStats` (returns hardcoded zeros). `use-inspection-dashboard.ts` exports the real implementation. The barrel `features/incidents/index.ts` exports stubs first, then overrides with real hooks — but `useInspectionSessionStats` from stubs is NOT overridden because the real one is in a separate file.

**Fix:** Verify the `InspectionDashboard.tsx` imports from the correct source (it does — imports from `use-inspection-dashboard`). Add the dashboard hooks to the override exports in `features/incidents/index.ts` to prevent future confusion, or remove the stub versions.

---

### LOW SEVERITY

#### L1: `as any` Casts in `AreaSessionWorkspace.tsx`
Lines 110, 129, 139-145, 160, 170, 194, 233 — multiple `as any` casts for `execution_mode`, `branch_id`, `building_id`, etc.

**Fix:** Extend the `InspectionSession` type to include `execution_mode`, `branch_id`, `subtype_id` fields that are actually used.

#### L2: Duplicate Session Actions Query Key Check
`use-action-queries.ts` line 13-14 has duplicated null-check:
```typescript
if (!sessionId || !profile?.tenant_id) return [];
if (!sessionId || !profile?.tenant_id) return [];
```

**Fix:** Remove the duplicate line.

#### L3: `useRefreshSessionAssets` Missing `deleted_at` on Existing Assets Query
Line 198-201 of `use-session-asset-mutations.ts` queries existing session assets without `deleted_at` filter.

**Fix:** Add `.is('deleted_at', null)`.

#### L4: `useSessionAssetByAssetId` Missing `deleted_at` Filter
Line 150-164 — QR scan lookup doesn't exclude soft-deleted session assets.

**Fix:** Add `.is('deleted_at', null)`.

---

## Dependency Map

```text
AreaSessionWorkspace.tsx
  ├── use-session-lifecycle.ts (useCompleteAreaSession, useCloseAreaSession, useReopenAreaSession, useCanCloseSession)
  ├── use-inspection-session-queries.ts (useSessionProgress, useSessionAssets)
  ├── use-session-parts-progress.ts (useSessionPartsProgress)
  ├── use-area-inspection-queries.ts (useAreaChecklistProgress, useAreaInspectionResponses)
  └── use-area-inspection-mutations.ts (useCompleteAreaSession ← DUPLICATE, remove)

SessionWorkspace.tsx
  └── use-inspection-session-queries.ts (useSessionProgress)
  └── use-session-lifecycle-mutations.ts (useCompleteSession, useRecordAssetInspection)

InspectionSessionsDashboard.tsx
  └── use-inspection-session-queries.ts (useInspectionSessions)

InspectionDashboard.tsx
  └── use-inspection-dashboard.ts (useInspectionSessionStats, etc.)
```

---

## File Change Summary

| # | File | Changes |
|---|------|---------|
| 1 | `use-session-lifecycle-mutations.ts` | Add `deleted_at` + `tenant_id` to sync-back query |
| 2 | `use-area-inspection-mutations.ts` | Remove duplicate `useCompleteAreaSession` |
| 3 | `use-area-inspections/index.ts` | Remove `useCompleteAreaSession` export |
| 4 | `use-area-inspection-queries.ts` | Add `deleted_at` filter to `useAreaInspectionResponses`; conditional polling on `useAreaChecklistProgress` |
| 5 | `use-session-parts-progress.ts` | Add `deleted_at` filter; conditional polling |
| 6 | `use-session-lifecycle.ts` | Conditional polling on `useCanCloseSession` |
| 7 | `AreaSessionWorkspace.tsx` | Restrict `canVerifyActions` to inspector/HSSE roles; reduce `as any` |
| 8 | `AuditSessionWorkspace.tsx` | Restrict `canVerifyActions` to inspector/HSSE roles |
| 9 | `use-action-queries.ts` | Remove duplicate null-check |
| 10 | `use-session-asset-mutations.ts` | Add `deleted_at` to `useRefreshSessionAssets` + `useSessionAssetByAssetId` sub-queries |
| 11 | `use-inspection-session-queries.ts` | Add `deleted_at` to `useSessionAssetByAssetId` |
| 12 | `InspectionSession` type (`types.ts`) | Add `execution_mode`, `branch_id` fields |
| 13 | `use-area-inspections.test.ts` | Update import source for `useCompleteAreaSession` |

---

## Security Validation Summary

| Check | Status |
|-------|--------|
| `tenant_id` on session queries | ✅ Fixed in prior audit |
| `tenant_id` on session asset queries | ✅ Fixed in prior audit |
| `deleted_at` on all queries | ⚠️ 5 missing — fixed in this plan |
| `canVerifyActions` role restriction | ⚠️ Open to all — fixed in this plan |
| RLS defense-in-depth | ✅ Explicit filters + RLS |
| Sync-back counter isolation | ⚠️ Missing filters — fixed in this plan |

---

## End-to-End Test Checklist

1. Create asset-mode session → start → inspect all assets (pass/fail/partial/not_accessible) → complete → verify status matches failures
2. Create area-mode session → start → respond to all items → complete → verify status
3. Session with zero failures completes as `closed`
4. Session with failures completes as `completed_with_open_actions`
5. Create corrective action from failed session → assign → execute → verify → close
6. Reopen closed session → re-inspect → complete again
7. Soft-delete a session asset → verify progress counts exclude it
8. Non-HSSE user cannot verify actions
9. Inspector can verify actions
10. Dashboard KPIs reflect accurate session stats
11. Area checklist polling stops after session completion
12. QR scan finds correct asset (not soft-deleted ones)

