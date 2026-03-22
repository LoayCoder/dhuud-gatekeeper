

# E2E Audit Plan — Incident Management Dashboards & KPI Integrity

## Audit Scope

The audit covers all incident-related dashboards, KPIs, and their data sources across:

1. **HSSE Event Dashboard** (`/incidents/dashboard`) — 20+ widgets, 4 KPI categories
2. **Action Center** (`/action-center`) — Cross-module stats with personal assignment
3. **My Actions** (`/incidents/my-actions`) — User-specific corrective actions
4. **Investigation Workspace** (`/incidents/investigate`) — Investigation-level stats
5. **Dashboard home** (`/dashboard`) — Module summary stats via `get_dashboard_module_stats` RPC
6. **Incident List** (`/incidents`) — Filtered counts and status cards

---

## Phase 1: Dashboard & Data Source Mapping (Discovery)

### HSSE Event Dashboard — Data Sources

| Widget/KPI | Source | Method |
|---|---|---|
| Executive Summary (TRIR, LTIFR, totals) | `incidents` table + `get_lagging_indicators` RPC | Client-side aggregation + RPC |
| Days Since Last Recordable | `get_days_since_last_recordable` RPC | Server-side |
| KPI Trend Cards (TRIR/LTIFR/DART/Severity) | `get_kpi_historical_trend` RPC | Server-side |
| Lagging Indicators | `get_lagging_indicators` RPC | Server-side |
| Leading Indicators | `get_leading_indicators` RPC | Server-side |
| Response Metrics | `get_response_metrics` RPC | Server-side |
| People Metrics | `get_incident_people_metrics` RPC | Server-side |
| Event Type Distribution | `incidents` table | Client-side aggregation |
| Severity Distribution | `incidents` table | Client-side aggregation |
| Status Distribution | `incidents` table | Client-side aggregation |
| Incident Type Breakdown | `incidents` table (incident_type/subtype) | Client-side |
| Monthly Trend | `incidents` table | Client-side (last 6 months hardcoded) |
| Location Analytics | `get_events_by_location` RPC | Server-side |
| Reporter Leaderboard | Custom query | Server-side |
| Actions Status | `corrective_actions` table | Client-side aggregation |
| Investigation Progress | `useIncidentProgression` hook | Client-side |
| RCA Analytics | `useRCAAnalytics` hook | Client-side aggregation |
| Period Comparison | `get_kpi_period_comparison` RPC | Server-side |
| Location Heatmap | `useLocationHeatmap` hook | Server-side |
| Cross-Branch Analytics | Separate component | Server-side |

### Action Center — Data Sources

| Stat | Source | Scope |
|---|---|---|
| Incidents total | `incidents.reporter_id = userId` | Personal |
| Open Investigations | `investigations.investigator_id = userId` | Personal |
| Corrective Actions (by source) | `corrective_actions.assigned_to = userId` | Personal |
| Gate Passes | `material_gate_passes.requested_by = userId` | Personal |
| Inspections | `inspection_sessions.created_by = userId` | Personal |
| Contractors | `contractor_companies` (tenant-wide) | Tenant |
| Video Inductions | `worker_inductions` (tenant-wide) | Tenant |

---

## Phase 2: Critical Issues Identified

### CRITICAL — 1000-Row Query Limit (Severity: CRITICAL)

**Finding**: `useHSSEEventDashboard` fetches ALL incident rows from the `incidents` table client-side for aggregation. Supabase has a **default 1000-row limit**. If a tenant has >1000 incidents in the date range, dashboard counts will be silently capped at 1000, producing **incorrect KPIs**.

**Affected**:
- Total events, incidents, observations counts
- Status distribution
- Severity distribution
- Overdue calculations
- Monthly trend
- Action closure stats (secondary query also unbounded)

**Fix**: Migrate client-side aggregation to a server-side RPC function, or add explicit `.range()` pagination to fetch all rows.

### HIGH — Overdue Calculation Applies to All Event Types (Severity: HIGH)

**Finding**: In `use-hsse-event-dashboard.ts` lines 220-232, the overdue SLA check runs for ALL open events (both incidents and observations), but increments `summary.incidents_overdue`. Observations with no severity will get the default 720-hour SLA and may be incorrectly counted as overdue incidents.

**Fix**: Gate the overdue check on `inc.event_type === 'incident'`.

### HIGH — Investigation Count Conflation (Severity: HIGH)

**Finding**: Lines 196-206: `total_investigations`, `investigations_open`, and `investigations_closed` are incremented for ALL incidents regardless of whether an investigation record exists. An incident in `submitted` status with no investigation is counted as an "open investigation." This inflates investigation metrics.

**Fix**: Query the `investigations` table separately, or only count incidents with investigation-related statuses.

### MEDIUM — Monthly Trend Uses Hardcoded 6-Month Window (Severity: MEDIUM)

**Finding**: Lines 248-264: The monthly trend always shows the last 6 calendar months from `new Date()`, ignoring the user's selected year/month filter. If viewing 2024 data, the trend still shows the 6 months ending at the current date.

**Fix**: Generate trend buckets from `startDate` to `endDate` instead of hardcoded `subMonths(now, i)`.

### MEDIUM — `closed_this_month` Ignores Date Filter (Severity: MEDIUM)

**Finding**: Line 170: `currentMonth` is always `format(new Date(), 'yyyy-MM')`, meaning "closed this month" always shows the current calendar month regardless of selected year/month filter.

**Fix**: Derive from the filter's end date.

### MEDIUM — Status Distribution Only Tracks 8 Statuses (Severity: MEDIUM)

**Finding**: `StatusDistribution` interface has only 8 status buckets, but the system has 50+ statuses. Most statuses (e.g., `pending_dept_rep_review`, `under_investigation`, `pending_clinic_review`) are silently dropped from the status distribution chart.

**Fix**: Use a dynamic `Record<string, number>` or add a catch-all "other" bucket.

### MEDIUM — Action Center vs Dashboard Scope Mismatch (Severity: MEDIUM)

**Finding**: Action Center uses **personal assignment** (userId-scoped), while HSSE Dashboard uses **tenant-wide** data. The same metric "Open Actions" will show different values. This is by design but may confuse users if not clearly labeled.

**Fix**: Ensure UI labels distinguish "My Actions" vs "All Actions" clearly.

### LOW — Near Miss Double-Counted in Event Type (Severity: LOW)

**Finding**: Lines 173-183: When `incident_type === 'near_miss'`, both `by_event_type.incident++` AND `by_event_type.near_miss++` fire. The `near_miss` count is a subset of `incident`, so `EventTypeDistributionChart` may show them as separate categories that sum to more than total incidents.

**Fix**: Ensure the chart handles near_miss as a sub-category, or don't double-count.

### LOW — `corrective_actions` Query Missing Branch Filter (Severity: LOW)

**Finding**: Lines 268-287: When branch/site filters are applied, the actions query falls back to filtering by `incident_id IN (matched_incident_ids)`. But actions can exist for observations too, and observation IDs from the same query are included. If an action's `incident_id` references an observation that was filtered by branch, it's correctly scoped. However, if `matchedIncidentIds` is empty, it returns zero actions even if standalone actions exist.

### LOW — KPI Trend Data Not Filtered by Year/Month (Severity: LOW)

**Finding**: Line 193: `useKPIHistoricalTrend` is called with `undefined, undefined` for start/end dates, defaulting to last 12 months regardless of selected filter.

---

## Phase 3: Recommended Fixes (Implementation Order)

### 1. Migrate Dashboard Aggregation to Server-Side RPC (CRITICAL)
Create a new `get_hsse_dashboard_summary` RPC function that performs all aggregation server-side, eliminating the 1000-row limit. Accept `p_tenant_id`, `p_start_date`, `p_end_date`, `p_branch_id`, `p_site_id` parameters.

### 2. Fix Overdue Calculation Scope (HIGH)
Add `if (inc.event_type === 'incident')` guard around the overdue SLA check in `use-hsse-event-dashboard.ts`.

### 3. Fix Investigation Count Logic (HIGH)
Only count incidents with investigation-related statuses (`investigation_in_progress`, `under_investigation`, `investigation_pending`, etc.) as investigations.

### 4. Align Monthly Trend with Date Filters (MEDIUM)
Generate trend buckets from `startDate` to `endDate` instead of hardcoded last 6 months.

### 5. Fix `closed_this_month` to Respect Filters (MEDIUM)
Use filter's date range instead of `new Date()`.

### 6. Expand Status Distribution (MEDIUM)
Use dynamic counting for all statuses, grouping rare ones into "Other".

### 7. Pass Date Filters to KPI Trend (LOW)
Wire `startDateStr`/`endDateStr` to `useKPIHistoricalTrend`.

### 8. Clarify Near Miss Counting (LOW)
Treat near_miss as a sub-type display, not a separate top-level category.

---

## Data Isolation Assessment

| Check | Status | Notes |
|---|---|---|
| Tenant isolation (incidents) | ✅ | `.eq('tenant_id', profile?.tenant_id)` |
| Tenant isolation (actions) | ✅ | `.eq('tenant_id', profile?.tenant_id)` |
| Branch filter | ✅ | `.eq('branch_id', branchId)` when selected |
| Site filter | ✅ | `.eq('site_id', siteId)` when selected |
| RLS enforcement | ✅ | Via `can_access_branch()` policies |
| Action Center user scope | ✅ | `assigned_to = userId` / `reporter_id = userId` |
| Cross-tenant leakage | ✅ None | All queries scoped to tenant |

---

## Final Assessment

**⚠️ Reliable with Critical Gap** — The 1000-row query limit is a data integrity risk that will silently produce incorrect KPIs for tenants with high event volumes. All other dashboard logic is sound but has medium-priority calculation issues (overdue scope, investigation conflation, trend window). Data isolation is properly enforced at all levels.

### Priority Implementation
1. **CRITICAL**: Server-side aggregation RPC (eliminates 1000-row cap)
2. **HIGH**: Fix overdue + investigation count logic (2 targeted line edits)
3. **MEDIUM**: Align trend/filter logic (3 edits)
4. **LOW**: Cosmetic counting improvements (2 edits)

