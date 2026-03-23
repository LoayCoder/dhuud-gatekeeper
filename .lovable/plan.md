

# System-Wide Engineering Audit Report

## Executive Summary

**Overall System Health: ⚠️ Mostly Sound with Targeted Issues**

The system has a well-structured Action Center architecture with proper role-based controls, RPC-backed permission enforcement, and database-level triggers. However, the audit identified **7 issues** across 3 severity levels that need attention.

---

## Findings by Module

### 1. Investigation Workspace — Start Investigation Button (Medium)

**Issue:** The `OverviewPanel` "Start Investigation" button (line 102) calls `onStartInvestigation` which is a **frontend-only tab unlock function** (`InvestigationWorkspace.tsx` line 110-125). It does NOT call the actual database mutation — it merely unlocks UI tabs. The real "Start Investigation" with database enforcement lives in `ApprovalWorkflowBanner.tsx` (line 83-124) where `startInvestigationMutation` updates `investigations.started_at` and `incidents.status`.

**Problem:** The `OverviewPanel` button has **no permission guard** — it shows to anyone viewing the investigation workspace. However, because it only unlocks frontend tabs (not database writes), and the database trigger `trg_enforce_investigation_start_transition` blocks unauthorized writes, the **actual risk is low** — it's a UX confusion issue, not a security bypass.

**Fix:** Add `isCurrentUserInvestigator` or `canApprove` guard to the `OverviewPanel` "Start Investigation" button, consistent with `ApprovalWorkflowBanner` which already checks `isCurrentUserInvestigator` (line 195).

### 2. RCAPanel — Unguarded "Start Investigation" Button (Medium)

**Issue:** `RCAPanel.tsx` (line 353) renders a "Start Investigation" button when `!investigation` that calls `createInvestigation.mutateAsync(incidentId)` with no permission check. This could allow any user with workspace access to create an investigation record.

**Fix:** Add a `canApprove` or role-based guard before rendering this button.

### 3. Action Center Stats — Potential Count Mismatch (Low)

**Issue:** `fetchIncidentStats` returns `pendingApprovals: 0` (line 27, stat-fetchers.ts) with a comment saying "The actual count comes from usePendingIncidentApprovals in the module." However, `ActionCenterStatsBar` uses `stats.summary.totalPendingApprovals` which aggregates from `incidentStats.pendingApprovals` (always 0) + gate pass + contractor counts. This means the top-level "Pending Approvals" KPI bar **excludes incident/observation pending approvals entirely**.

**Impact:** The summary KPI undercounts pending approvals. The per-module cards show correct counts (they use `usePendingIncidentApprovals` directly), so the per-module view is accurate.

**Fix:** Either integrate the RPC-based count into the stats aggregation, or add a clarifying tooltip that the summary excludes incident approvals.

### 4. Audits Module — Shares Data Source with Inspections (Low)

**Issue:** Both `AuditsModule` and `InspectionsModule` call `useMyInspectionActions()` and apply the same filter. The Audits "Open Findings" sheet renders `<InspectionActionsList />` — identical to the Inspections "My Actions" sheet. Users see duplicate data across two modules.

**Fix:** Either differentiate the queries (e.g., filter by `source_type` or inspection type) or merge the modules.

### 5. Admin Override Badge — Missing Translations (Low)

**Issue:** `adminOverride` and `adminOverrideTooltip` translation keys were only added to `en` and `ar` locale files. The `ur`, `hi`, and `fil` locales will fall back to English keys, which is acceptable but incomplete.

**Fix:** Add translations to remaining locale files.

### 6. OverviewPanel Start Button — No Loading/Disabled State (Low)

**Issue:** The "Start Investigation" button in `OverviewPanel` (line 102) has no `disabled` state or loading indicator. It can be clicked multiple times.

**Fix:** Add a loading/clicked state guard.

### 7. Pending Approvals N+1 Query Pattern (Low — Performance)

**Issue:** `usePendingIncidentApprovals` (line 237-272) makes individual RPC calls (`can_approve_investigation`) for each pending incident in a loop. With 16+ pending items, this creates 16+ sequential database calls.

**Fix:** Consider a batch RPC or server-side filtering approach.

---

## Modules Verified as Correct

| Module | Actionability | Role Control | Data Integrity |
|--------|:---:|:---:|:---:|
| Incidents Module | ✅ | ✅ | ✅ |
| Observations Module | ✅ | ✅ | ✅ |
| Gate Passes Module | ✅ | ✅ | ✅ |
| Inspections Module | ✅ | ✅ | ✅ |
| Contractors Module | ✅ | ✅ | ✅ |
| Video Induction Module | ✅ | ✅ | ✅ |
| User Management Module | ✅ | ✅ (admin-only) | ✅ |
| Password Reset Module | ✅ | ✅ (admin-only) | ✅ |

**Backend enforcement verified:**
- `can_approve_investigation` RPC: Correctly enforces role + assignment + contractor isolation
- `can_start_investigation` RPC: Correctly requires assigned investigator + valid status
- `trg_enforce_investigation_start_transition`: Database trigger blocks unauthorized starts
- `trg_enforce_incident_investigation_progress_transition`: Blocks invalid status transitions
- Pending approvals queries: Correctly RPC-filtered per user
- Corrective actions: Correctly filtered by `assigned_to = userId`
- Stats fetchers: Correctly user-scoped with `released_at` gate for incident-source actions

---

## Recommended Fix Plan

### Immediate Fixes (2 items)

1. **Guard OverviewPanel "Start Investigation" button** — Add `isCurrentUserInvestigator` check before rendering the button, matching `ApprovalWorkflowBanner`'s existing pattern
2. **Guard RCAPanel "Start Investigation" button** — Add permission check (canApprove or role check) before rendering `createInvestigation` button

### Structural Fixes (2 items)

3. **Fix summary KPI count** — Include incident/observation pending approval counts in `ActionCenterStatsBar` summary, either by passing the RPC-based count or adding a dedicated stat query
4. **Differentiate Audits vs Inspections data** — Add `source_type` or inspection category filter to avoid duplicate data across modules

### Low Priority (3 items)

5. Add missing locale translations for `adminOverride`
6. Add loading state to OverviewPanel Start button
7. Consider batch RPC for pending approvals performance

---

## Files to Modify

- `src/features/investigation/components/OverviewPanel.tsx` — Add permission guard to Start button
- `src/features/investigation/components/RCAPanel.tsx` — Add permission guard to Start button
- `src/features/incidents/hooks/use-action-center-stats/use-action-center-stats.ts` — Fix summary KPI count
- `src/locales/ur/translation.json` — Add missing translations
- `src/locales/hi/translation.json` — Add missing translations
- `src/locales/fil/translation.json` — Add missing translations

