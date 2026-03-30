

# Deep Audit Report: Inspection Module (End-to-End)

## Audit Scope
Full review of the inspection module: session lifecycle, asset inspection, part-level results, corrective actions, data isolation, security, UI/UX, and integration health.

---

## Critical Issues

### ISSUE 1: Missing `tenant_id` Filter on Session Queries (SECURITY — HIGH)
**Files:** `use-inspection-session-queries.ts` (lines 17-45, 77-103, 106-133, 166-203)

The `useInspectionSessions`, `useSessionAssets`, `useUninspectedAssets`, and `useSessionProgress` queries do NOT filter by `tenant_id`. They rely solely on RLS policies for isolation. While RLS should enforce this at the DB level, the project guidelines mandate explicit `tenant_id` filtering on all queries as defense-in-depth.

**Fix:** Add `.eq('tenant_id', profile.tenant_id)` to all session and session-asset queries, matching the pattern used in `usePartInspectionResults`.

### ISSUE 2: Duplicate `useInspectionSessions` / `useSessionProgress` Hooks (MEDIUM)
**Files:** `src/hooks/use-inspection-sessions.ts` (stub file) vs `src/features/incidents/hooks/use-inspection-sessions/`

Two completely separate implementations exist:
- The **stub** file at `src/hooks/use-inspection-sessions.ts` uses a `looseClient` workaround and exports `useInspectionSessions`, `useSessionProgress`, etc.
- The **canonical** file at `src/features/incidents/hooks/use-inspection-sessions/` has the real, full implementations.
- `AreaSessionWorkspace.tsx` line 63 imports `useSessionProgress` from the **stub**, not the canonical source. The stub version queries `area_inspection_responses` while the canonical queries `inspection_session_assets` — different data sources for different modes.

**Fix:** Consolidate. The stub's `useSessionProgress` should be removed or renamed since the canonical one (`useAssetSessionProgress` alias in the workspace) already handles asset-mode. The area-mode progress is handled by `useAreaChecklistProgress`. The stub creates confusion and a maintenance trap.

### ISSUE 3: `useCompleteSession` (Lifecycle) Doesn't Count `partial` as Failures (MEDIUM)
**File:** `use-session-lifecycle-mutations.ts` lines 289-295

The `useCompleteSession` hook checks for `['not_good', 'partial']` to determine `hasOpenActions`, but the count logic uses the `head: true` pattern incorrectly:
```ts
const hasOpenActions = (failedCount as unknown as { count?: number })?.count ? ... : false;
```
The `.select('id', { count: 'exact', head: true })` returns `{ count, data: null }` — but the code assigns it to `failedCount` which is `data` (null). The `count` is on the response object, not `data`. This means `hasOpenActions` is likely **always false**, causing sessions with failures to be marked as `closed` instead of `completed_with_open_actions`.

**Fix:** Use the correct Supabase count pattern:
```ts
const { count: failedCount } = await supabase
  .from('inspection_session_assets')
  .select('id', { count: 'exact', head: true })
  .eq('session_id', sessionId)
  .in('quick_result', ['not_good', 'partial']);
const hasOpenActions = (failedCount ?? 0) > 0;
```

### ISSUE 4: `useCompleteAreaSession` Always Sets Status to `completed_with_open_actions` (MEDIUM)
**File:** `use-session-lifecycle.ts` lines 38-59

`useCompleteAreaSession` unconditionally sets `status: 'completed_with_open_actions'` without checking if failures actually exist. The other `useCompleteSession` (in lifecycle mutations) does check for failures. This creates inconsistency — area-mode sessions always get `completed_with_open_actions` even if 100% passed.

**Fix:** Either merge this into `useCompleteSession` or add the same failure-detection logic.

---

## Medium Issues

### ISSUE 5: `useSessionProgress` (Canonical) Missing `deleted_at` Filter (MEDIUM)
**File:** `use-inspection-session-queries.ts` line 175

The `useSessionProgress` query fetches all `inspection_session_assets` rows by `session_id` but does not filter `.is('deleted_at', null)`. If soft-deleted assets exist, they'll inflate counts.

**Fix:** Add `.is('deleted_at', null)` to the query.

### ISSUE 6: `useSessionAssets` Missing `deleted_at` Filter (MEDIUM)
**File:** `use-inspection-session-queries.ts` line 96

Same issue — `useSessionAssets` doesn't filter out soft-deleted session assets.

**Fix:** Add `.is('deleted_at', null)`.

### ISSUE 7: Cache Invalidation Mismatch in `useCompleteAreaSession` / `useCloseAreaSession` (MEDIUM)
**File:** `use-session-lifecycle.ts` lines 54-58, 90-94

These hooks invalidate `['area-session', sessionId]` but the canonical query uses `['inspection-session', sessionId]`. This means after completing/closing/reopening, the session detail won't refresh until manual navigation.

**Fix:** Invalidate `['inspection-session', sessionId]` and `['inspection-sessions']` as well.

### ISSUE 8: `canVerifyActions` Is Always True (LOW-MEDIUM)
**File:** `AreaSessionWorkspace.tsx` line 149
```ts
const canVerifyActions = !!profile;
```
Any authenticated user can verify actions. Per project governance (Section 17.4), only inspectors/HSSE officers should verify.

**Fix:** Check if the user is the session inspector or has HSSE role via RPC.

---

## Low Issues

### ISSUE 9: Aggressive Polling Intervals
- `useSessionProgress`: 2s (`use-inspection-session-queries.ts:202`)
- `useSessionPartsProgress`: 3s (`use-session-parts-progress.ts:106`)
- `useCanCloseSession`: 5s (`use-session-lifecycle.ts:34`)
- `useAreaChecklistProgress`: 2s (`use-area-inspection-queries.ts`)

These should only poll during `in_progress` status.

**Fix:** Add conditional refetch: `refetchInterval: session?.status === 'in_progress' ? 3000 : false`

### ISSUE 10: `handleFailureSubmit` in `QuickInspectionCard` Is Unreachable (LOW)
**File:** `QuickInspectionCard.tsx` lines 76-107

`handleFailureSubmit` calls `recordInspection.mutateAsync` with `quick_result: 'not_good'` and creates a finding. But `showFailureDialog` is never set to `true` anywhere in the component — the FailureReasonDialog is rendered but never opened.

**Fix:** Either remove the dead code or wire it to a trigger (e.g., the confirm-fail button).

### ISSUE 11: `as any` Usage in Workspace (LOW)
**File:** `AreaSessionWorkspace.tsx` lines 110, 129, 139-145, 537, 603

Multiple `as any` casts for `execution_mode`, `branch_id`, `building_id` etc. These are functional but bypass type safety.

---

## Verified Working Correctly

| Area | Status |
|------|--------|
| Part inspection save (upsert with `tenant_id` + `branch_id`) | OK |
| Part-level condition derivation (critical fail blocks partial) | OK |
| Explicit confirm flow (no auto-save) | OK |
| Post-confirm lock + auto-advance | OK |
| Not Accessible shortcut with overlay | OK |
| Corrective action creation with failure snapshot | OK |
| Action verification/rejection workflow | OK |
| Session creation (two-step: create draft + start) | OK |
| Asset backfill/self-healing on mount | OK |
| Soft delete via SECURITY DEFINER RPC | OK |
| RTL support (logical properties, `dir` prop on dialogs) | OK |
| QR scanner integration | OK |
| Session export dropdown | OK |

---

## Recommended Fix Plan (Priority Order)

| # | Issue | Severity | File(s) |
|---|-------|----------|---------|
| 1 | Fix `useCompleteSession` count pattern (always-false bug) | HIGH | `use-session-lifecycle-mutations.ts` |
| 2 | Add `tenant_id` filter to session queries | HIGH | `use-inspection-session-queries.ts` |
| 3 | Fix cache invalidation keys in lifecycle hooks | MEDIUM | `use-session-lifecycle.ts` |
| 4 | Add `deleted_at` filter to `useSessionProgress` + `useSessionAssets` | MEDIUM | `use-inspection-session-queries.ts` |
| 5 | Fix `useCompleteAreaSession` to check for failures | MEDIUM | `use-session-lifecycle.ts` |
| 6 | Remove or consolidate stub file | MEDIUM | `src/hooks/use-inspection-sessions.ts` |
| 7 | Conditional polling intervals | LOW | Multiple |
| 8 | Remove dead `handleFailureSubmit` code | LOW | `QuickInspectionCard.tsx` |

