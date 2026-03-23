

# Inspection Module UI & Functional Audit Report

## Module Health Score: ⚠️ Minor Issues

The Inspection Module is architecturally sound with a comprehensive template-driven design supporting 3 session types (Asset, Area, Audit), full lifecycle management, GPS/photo capture, AI-assisted action creation, SLA timers, and findings management. However, the audit identified **5 issues** — 2 critical navigation bugs, 1 data accuracy bug, and 2 UX improvements.

---

## Findings Table

| # | Area | Issue | Severity | Root Cause | Impact |
|---|------|-------|----------|------------|--------|
| 1 | Navigation | `CreateAreaSessionDialog` navigates to `/inspections/sessions/${id}` — loads **Asset** workspace instead of Area workspace | **Critical** | Missing `/area` suffix in navigate call (line 165) | Area inspections open wrong workspace; user sees QR scanner instead of checklist |
| 2 | Navigation | `CreateAuditSessionDialog` navigates to `/inspections/audit/${id}` — **404/no route match** | **Critical** | Route is `/inspections/sessions/${id}/audit` but dialog uses `/inspections/audit/${id}` (line 149) | Audit sessions navigate to non-existent page after creation |
| 3 | Navigation | `CreateSessionDialog` always navigates to `/inspections/sessions/${id}` regardless of session type (asset/area/audit) | **Critical** | No session-type routing logic (line 145) | Area and audit sessions created via generic dialog open wrong workspace |
| 4 | Data | `InspectionSessionsDashboard` status tab counts are computed from already-filtered `sessions` array | **Medium** | `statusCounts` computed from query result that already has status filter applied (lines 35-40) | Tab counts show 0 for non-selected statuses when a filter is active |
| 5 | Navigation | `InspectionDashboard` recent findings link uses `/inspections/sessions/area/${id}` — no matching route | **Low** | Incorrect path format at line 190 | Clicking "View" on a finding navigates to non-existent page |

---

## Verified as Correct

- Session lifecycle: Draft → In Progress → Completed → Closed (with reopen)
- Area checklist: Pass/Fail/NA with auto-save, GPS capture, photo upload, rating/numeric/text types
- Findings panel: Classification, risk level, SLA timers, create action from finding, close finding
- Action creation dialog: AI suggestion via edge function, form validation, department/user assignment
- Session completion dialog: Closure status check, pending actions list, proper guards
- Session actions panel: Action verification, status badges, linked findings
- Session export functionality
- Bulk swipe inspection mode
- Schedule management: CRUD, pause/resume, calendar view, overdue detection
- Delete guards: Prevents deleting closed sessions
- RTL/i18n support throughout all components
- Loading states and error feedback on all mutations

---

## Fix Plan

### Fix 1 — Navigation routing for all 3 create dialogs (Critical)

**`CreateAreaSessionDialog.tsx` line 165:**
Change `navigate(/inspections/sessions/${session.id})` to `navigate(/inspections/sessions/${session.id}/area)`

**`CreateAuditSessionDialog.tsx` line 149:**
Change `navigate(/inspections/audit/${session.id})` to `navigate(/inspections/sessions/${session.id}/audit)`

**`CreateSessionDialog.tsx` lines 143-145:**
Add session-type routing logic:
```
const sessionType = data.sessionType;
const suffix = sessionType === 'area' ? '/area' : sessionType === 'audit' ? '/audit' : '';
navigate(`/inspections/sessions/${session.id}${suffix}`);
```

### Fix 2 — Status tab counts (Medium)

**`InspectionSessionsDashboard.tsx`:**
Fetch ALL sessions (without status filter) for computing tab counts, and separately filter for display. Use two queries or always fetch all and filter client-side for display.

Simplest approach: always fetch all sessions, compute counts from full list, then filter for display:
- Change `useInspectionSessions` call to always fetch all
- Filter `sessions` client-side based on `statusFilter` for rendering
- Compute `statusCounts` from the unfiltered full list

### Fix 3 — Dashboard findings link (Low)

**`InspectionDashboard.tsx` line 190:**
Change link from `/inspections/sessions/area/${...}` to `/inspections/sessions/${...}/area` to match the actual route pattern.

---

## Files to Modify

1. `src/features/incidents/components/inspections/sessions/CreateAreaSessionDialog.tsx` — Fix navigate path
2. `src/features/incidents/components/inspections/sessions/CreateAuditSessionDialog.tsx` — Fix navigate path
3. `src/features/incidents/components/inspections/sessions/CreateSessionDialog.tsx` — Add session-type routing
4. `src/pages/inspections/InspectionSessionsDashboard.tsx` — Fix status count logic
5. `src/pages/inspections/InspectionDashboard.tsx` — Fix findings link path

