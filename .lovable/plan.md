

# E2E Audit Report — Incidents Module (Post-Submission Flow)

## Finding 1: CRITICAL — Investigation Workspace CTA uses wrong URL pattern

**File:** `src/pages/incidents/IncidentDetail.tsx` (line 322)

The "Open Investigation Workspace" CTA navigates to `/incidents/investigate/${incident.id}`, but:
- The route is defined as `/incidents/investigate` (no path param)
- The workspace reads the incident ID from `?incident=` query parameter
- Every other link in the codebase uses `/incidents/investigate?incident=${id}`

This means clicking the CTA on the IncidentDetail page navigates to a non-existent route, which either shows the wrong content or a blank page.

**Fix:** Change line 322 from:
```
<Link to={`/incidents/investigate/${incident.id}`}>
```
to:
```
<Link to={`/incidents/investigate?incident=${incident.id}`}>
```

---

## Finding 2: MEDIUM — `STATUS_CATEGORIES` missing several statuses

**File:** `src/lib/incident-status-colors.ts`

The `STATUS_CATEGORIES` map (used by `getStatusCategory`, `getStatusBorderColor`, etc.) is missing these statuses, causing them to default to `'open'` (blue) instead of their correct category:

| Status | Should Be |
|--------|-----------|
| `pending_dept_rep_mandatory_action` | `action_required` |
| `pending_consultant_actions` | `action_required` |
| `pending_consultant_verification` | `action_required` |
| `pending_site_client_action_approval` | `action_required` |
| `contractor_action_implementation` | `action_required` |
| `pending_contractor_action` | `action_required` |
| `pending_hsse_incident_validation` | `pending_closure` |
| `pending_hsse_manager_closure` | `pending_closure` |
| `pending_escalation_approval` | `action_required` (already present) |
| `pending_hsse_rejection_review` | `action_required` |
| `pending_investigator_assignment` | `investigation` |
| `investigation_closed` | `closed` (already present) |

**Impact**: Cards for these statuses show incorrect border/background colors (blue "open" instead of warning/pending).

**Fix:** Add missing entries to `STATUS_CATEGORIES`.

---

## Finding 3: LOW — `ACTION_VERBS` missing several statuses

**File:** `src/lib/incident-status-colors.ts`

The `ACTION_VERBS` map is missing entries for:
- `pending_clinic_review` → "Awaiting clinic review"
- `pending_department_manager_violation_approval` → "Pending violation approval"
- `pending_contract_controller_approval` → "Pending contract controller approval"
- `pending_hsse_incident_validation` → "Verifying closure"
- `pending_hsse_rejection_review` → "Reviewing rejection"
- `osha_reportable` → "OSHA report required"
- `monitoring_30_day/60_day/90_day` → "Monitoring in progress"

These fall through to the generic fallback, which works but is less descriptive.

**Fix:** Add explicit entries to `ACTION_VERBS`.

---

## Finding 4: LOW — `InvestigationTabsContent` tab visibility logic is inverted in naming

The `isTabLocked` function returns `true` when a tab is NOT in `unlockedTabs`. But the rendering condition `{isTabLocked('evidence') && (...)}` shows the tab when it's "locked". This is functionally correct (tabs render when they've been added to the unlocked list, but the function name is inverted — it should be `isTabUnlocked`).

**Impact**: No functional bug — naming confusion only. No code change needed.

---

## Verified Clean Areas

- **InvestigationWorkflowCards**: All 35+ statuses covered with dedicated action cards
- **UnifiedTimelineTracker**: All statuses mapped to correct 5-step indices
- **current-owner.ts**: All statuses mapped (including the 6 added in previous pass)
- **Audit Trail**: UUID resolution working
- **Closure flow**: Prerequisites card, approval card, and closure dialog correctly gated
- **Escalation**: `upgraded_to_incident` banner and backlink both working
- **Monitoring**: 30/60/90-day cards rendering correctly

---

## Summary of Required Changes

| Priority | File | Change |
|----------|------|--------|
| CRITICAL | `src/pages/incidents/IncidentDetail.tsx` | Fix CTA link to use `?incident=` query param |
| MEDIUM | `src/lib/incident-status-colors.ts` | Add ~10 missing statuses to `STATUS_CATEGORIES` |
| LOW | `src/lib/incident-status-colors.ts` | Add ~8 missing entries to `ACTION_VERBS` |

