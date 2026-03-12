

# Action Center Implementation Audit Report

## 1. Page Responsiveness and PWA Support — PASS

**Findings:**
- Desktop: `lg:grid-cols-2` grid layout across all sections
- Tablet/Mobile: Single column stack (grid default)
- PWA safe-area: `pb-[env(safe-area-inset-bottom)]` on `EnterprisePage`
- Touch targets: All buttons use `min-h-[44px]` (44px minimum)
- Sheet content uses `WebkitOverflowScrolling: 'touch'` and `overscroll-contain`
- RTL support throughout via `i18n.dir()` and logical properties (`start`, `end`, `ms-`, `me-`)
- KPI grid: `grid-cols-2 sm:grid-cols-4` — responsive

**Minor note:** No `md:grid-cols-2` breakpoint — jumps from 1-col to 2-col at `lg` (1024px). Tablets in portrait (768-1023px) get single column. This is acceptable but could be improved.

## 2. Incidents Management Card Behavior — PASS

**Findings:**
- Card displays 4 KPIs: Overdue, Pending, Investigations, Total
- 6 action links: Report Incident, View All, My Actions, Investigation Workspace, Pending Approvals, Dashboard
- Each KPI is clickable (has `onClick` handler) with proper `role="button"`, `tabIndex`, and keyboard support
- Card is collapsible via chevron button
- Attention badge shows `overdue + pendingApprovals` count
- Critical state (`hasCritical`) triggers destructive border styling

## 3. Metric Click Interaction — WARNING

**What works:**
- "My Actions" opens Sheet with `InlineActionsPanel` showing: reference ID, title, priority badge, status icon, due date, overdue indicator
- Each row clicks through to `/incidents/{incident_id}`
- Workflow actions (Start Work, Complete, Extension Request) work inline
- Approvals list shows: Reference, Title, Status, Severity, Created Date
- Investigations list shows: Reference, Title, Status, Severity, Target Date

**Gaps found:**
- **Missing "Assigned Role" column** — the spec requires showing the user's role (Investigator/Reviewer/Approver) per row. None of the three lists display this.
- **Missing "Created Date" in My Actions** — `InlineActionsPanel` shows due date but not created date
- **"Pending" KPI inconsistency** — The "Pending" KPI value comes from `correctiveActionStats.incidentPending` (tenant-wide corrective actions with pending status), but clicking it opens the "Pending Approvals" sheet which shows incidents awaiting approval. These are different datasets — the count won't match the list.
- **"Overdue" KPI also opens approvals** — `handleKpiClick` maps Overdue click to the approvals sheet, but the Overdue count is tenant-wide overdue corrective actions, not overdue approvals. Misleading.

## 4. Panel Display Logic — Drawer (PASS)

**Method:** Right-side Sheet (slide-over drawer) via `ActionListSheet`
- Uses Radix `Sheet` with `side="right"` (RTL-aware: flips to left)
- Width: `w-full sm:max-w-lg`
- Does NOT navigate away from Action Center
- User stays in context — can close and interact with other cards

## 5. Data Filtering Accuracy — WARNING

**What works:**
- **My Actions**: `useMyCorrectiveActions()` filters by `assigned_to = user.id` + tenant isolation
- **Investigations**: `useMyAssignedInvestigations()` filters by `investigator_id = user.id` + tenant + non-terminal statuses
- **Pending Approvals**: `usePendingIncidentApprovals()` uses `can_approve_investigation` RPC per incident — role-aware server-side check

**Issues:**
- **KPI counts are tenant-wide, badge counts are user-specific** — This is by design (per memory context), but the Overdue/Pending KPIs open sheets that show user-specific data. The count on the KPI won't match what's in the sheet. Users will see "5 Overdue" in the KPI but potentially 0 items in the opened sheet.
- **"Pending Approvals" badge uses `stats.pendingApprovals`** which is tenant-wide (from `fetchIncidentStats`), not user-specific. The sheet content IS user-filtered via `usePendingIncidentApprovals()`. Badge count mismatch with actual list.
- **Investigations badge** uses `stats.openInvestigations` (tenant-wide) on the Sheet, but the list shows only user-assigned investigations.

## 6. Performance and API Behavior — PASS

**What works:**
- KPI stats loaded once on page mount via `useActionCenterStats` (parallelized `Promise.all`)
- Sheet content (`InlineActionsPanel`, `IncidentApprovalsList`, `IncidentInvestigationsList`) uses React Query — data fetched on component mount (when Sheet opens), cached thereafter
- Loading skeletons present in all lists
- Error handling: `InlineActionsPanel` has try/catch on mutations; query hooks throw on error (React Query handles)
- `useMyCorrectiveActions` is called at module level for badge count — this means one API call happens on page load even before clicking "My Actions". Acceptable tradeoff for accurate badge.

**Minor concern:**
- `usePendingIncidentApprovals` makes N+1 RPC calls (`can_approve_investigation` per incident). For tenants with many pending incidents, this could be slow. Not a bug but a scaling concern.

## 7. Component Architecture — PASS

**Reusable components implemented:**
- `ActionModuleCard` — Generic card with KPIs, action links, children slot
- `ActionListSheet` — Generic Sheet wrapper (title, badge, children)
- `ActionListTable` — Generic table with search, sort, pagination, mobile cards
- `useActionListState` — Reusable hook for filtering/sorting/pagination state

**Naming vs spec:**
- Spec expected `ActionCenterCard` → implemented as `ActionModuleCard` (same purpose)
- Spec expected `ActionMetricButton` → KPIs are inline in `ActionModuleCard` (acceptable)
- Spec expected `ActionListPanel` → implemented as `ActionListSheet` (better)

No duplicated components found. Logic is well separated from UI.

## 8. Extendability for Other Modules — PASS

All components are generic and typed with generics (`<T>`). To add the same pattern to another module:
1. Create a module-specific list component using `ActionListTable`
2. Wrap it in `ActionListSheet`
3. Add `openSheet` state to the module component

`ObservationsModule`, `GatePassesModule`, `InspectionsModule`, `AuditsModule` already follow the same `ActionModuleCard` pattern — they just need Sheet integration.

## 9. UX Quality Evaluation — Good

**Strengths:**
- Clean visual hierarchy: KPIs → Actions → Sheets
- Drawer keeps context (no page navigation)
- Mobile card layout in `ActionListTable` is well done
- Overdue items highlighted with destructive colors
- RTL fully supported

**Areas for improvement:**
- KPI count vs Sheet content mismatch is confusing (tenant-wide vs user-specific)
- No transition animation on Sheet content swap
- "Total" KPI is not clickable (no action) — could open "View All" or be visually distinguished

## 10. Final Implementation Verdict — WARNING

### Summary
The implementation is architecturally sound, well-componentized, and extensible. The Sheet-based interaction pattern is clean and PWA-ready. However, there are data consistency issues that will confuse users.

### Critical Issues
1. **KPI-to-Sheet count mismatch** — Tenant-wide KPI numbers (Overdue: 5, Pending: 3) open sheets with user-specific filtered data (might show 0 items). This breaks user trust.
2. **"Overdue" KPI opens wrong sheet** — Opens "Pending Approvals" instead of showing overdue corrective actions.

### Architectural Concerns
- N+1 RPC pattern in `usePendingIncidentApprovals` will degrade at scale
- Missing "Assigned Role" column across all lists (spec requirement)

### Recommended Fixes (Implementation Plan)

**Fix 1: KPI click targets** — Map Overdue KPI to a new "Overdue Actions" sheet (or the My Actions sheet pre-filtered). Map Pending KPI to show pending corrective actions, not incident approvals.

**Fix 2: Badge count consistency on Sheets** — Pass user-specific counts to Sheet badges instead of tenant-wide stats. For Approvals sheet, use the count from `usePendingIncidentApprovals` data. For Investigations sheet, use count from `useMyAssignedInvestigations` data.

**Fix 3: Add Assigned Role column** — In `IncidentApprovalsList` and `IncidentInvestigationsList`, add a column showing the user's role context (Investigator, Approver, etc.).

### Files to Modify
1. `src/components/action-center/modules/IncidentsModule.tsx` — Fix KPI click mapping, use user-specific badge counts on Sheets
2. `src/components/action-center/modules/IncidentApprovalsList.tsx` — Add assigned role column
3. `src/components/action-center/modules/IncidentInvestigationsList.tsx` — Add assigned role column

