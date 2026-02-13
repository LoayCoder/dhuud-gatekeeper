

## Dashboard Audit Report and Fix Plan

### Audit Summary

I found **4 broken database functions** causing errors on the HSSE Event Dashboard. Here is each issue and the fix.

---

### Issue 1: `get_dashboard_quick_action_counts` -- Status 400
- **Error:** `invalid input value for enum incident_status: "pending_expert_screening"`
- **Root Cause:** The function references two non-existent enum values: `pending_expert_screening` and `pending_site_client_approval`. The actual enum values are `expert_screening` and there is no `pending_site_client_approval`.
- **Fix:** Update the function SQL to use the correct enum values.

### Issue 2: `get_top_reporters` -- Status 404
- **Error:** Hook sends `p_branch_id` and `p_site_id` params, but the DB function only accepts `(p_limit, p_start_date, p_end_date)`.
- **Fix:** Either update the DB function to accept `p_branch_id` and `p_site_id`, OR update the hook to stop sending them. The better approach is to **update the DB function** so branch/site filtering works with the dashboard filters.

### Issue 3: `get_events_by_location` -- Status 404
- **Error:** Hook sends `p_branch_id` and `p_site_id` params, but the DB function only accepts `(p_start_date, p_end_date)`.
- **Fix:** Same approach -- **update the DB function** to accept `p_branch_id` and `p_site_id` parameters.

### Issue 4: `get_kpi_historical_trend` -- Status 400
- **Error:** `column i.incident_date does not exist`
- **Root Cause:** The function references `i.incident_date` but the `incidents` table uses `occurred_at` instead.
- **Fix:** Replace all references to `i.incident_date` with `i.occurred_at` in the function.

---

### What's Working (Confirmed OK)

The following dashboard components and their hooks are returning 200 and functioning correctly:

- Executive Summary (via `get_hsse_event_dashboard`)
- Cross-Branch Analytics (via `get_cross_branch_analytics`) -- correctly ignores branch filter, respects year/month
- Lagging Indicators (via `get_lagging_indicators`)
- Leading Indicators (via `get_leading_indicators`)
- Response Metrics (via `get_response_metrics`)
- People Metrics (via `get_incident_people_metrics`)
- Days Since Last Recordable (via `get_days_since_last_recordable`)
- KPI Period Comparison (via `get_kpi_period_comparison`)
- Observation Trend (via `get_observation_trend_analytics`)
- Residual Risk (via `get_residual_risk_metrics`)
- Recent Events Card -- correctly filtering by branch, year, and month
- Cross-Branch Summary and Heatmap -- correctly ignoring branch filter

### Filter Integration Status

| Component | Branch Filter | Year/Month Filter | Status |
|-----------|--------------|-------------------|--------|
| Executive Summary | Respects | Respects | OK |
| KPI Cards (TRIR, LTIFR, etc.) | Respects | Respects | OK |
| Recent Events | Respects | Respects | OK |
| Cross-Branch Analytics | Ignores (correct) | Respects | OK |
| Top Reporters | Respects | Respects | BROKEN (404) |
| Location Analytics | Respects | Respects | BROKEN (404) |
| Quick Action Counts | N/A | N/A | BROKEN (400) |
| KPI Historical Trend | Respects | Respects | BROKEN (400) |

---

### Implementation Plan

**Step 1: Fix `get_dashboard_quick_action_counts`** (DB migration)
- Replace `pending_expert_screening` with `expert_screening`
- Replace `pending_site_client_approval` with a valid status or remove it

**Step 2: Fix `get_top_reporters`** (DB migration)
- Add `p_branch_id UUID DEFAULT NULL` and `p_site_id UUID DEFAULT NULL` parameters
- Add branch/site WHERE clauses to the query

**Step 3: Fix `get_events_by_location`** (DB migration)
- Add `p_branch_id UUID DEFAULT NULL` and `p_site_id UUID DEFAULT NULL` parameters
- Add branch/site WHERE clauses to the query

**Step 4: Fix `get_kpi_historical_trend`** (DB migration)
- Replace all `i.incident_date` references with `i.occurred_at`

All 4 fixes are database-only migrations. No frontend code changes required -- the hooks are already sending the correct parameters.

