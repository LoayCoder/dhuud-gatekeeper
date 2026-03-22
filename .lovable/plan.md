

# Fix Plan: Incident Dashboard & KPI Integrity Issues

## Issues to Fix (Priority Order)

### 1. CRITICAL — `rejected_invalid` enum value missing from DB
The `get_hsse_dashboard_summary` RPC references `'rejected_invalid'` in 12 places, but the `incident_status` enum does not contain this value. This causes a **runtime failure** of the entire dashboard RPC.

**Fix:** Replace all `'rejected_invalid'` references in the RPC with the actual terminal statuses from the enum. The closed/terminal statuses that exist are: `closed`, `closed_rejected_approved_by_hsse`, `contractor_violation_cancelled`, `contractor_violation_terminated`. Update the RPC to use a proper closed-set list.

### 2. CRITICAL — `get_kpi_historical_trend` references non-existent column `incident_date`
The current RPC uses `i.incident_date` but the `incidents` table only has `occurred_at`. This causes the trend query to fail silently or error out.

**Fix:** Replace `i.incident_date` with `i.occurred_at` throughout the function.

### 3. HIGH — KPI Trend uses hardcoded `200000` manhours instead of real data
TRIR, LTIFR, DART, and Severity Rate all divide by the constant `200000`, making the formulas trivially wrong (e.g., TRIR = recordable count, not a rate). The `manhours` table exists with real data (`employee_hours`, `contractor_hours`).

**Fix:** Rewrite `get_kpi_historical_trend` to LEFT JOIN the `manhours` table (aggregated monthly by `period_date`) and use `SUM(employee_hours + contractor_hours)` as the denominator. Fall back to `200000` only when no manhours data exists for a month. Also compute `near_miss_rate` and `action_closure_pct` from real data.

### 4. MEDIUM — Investigation progress uses hardcoded mock values
`InvestigationListView.tsx` has `getMockProgress()` returning static percentages (10/25/60/90/100) based on status strings instead of actual completion data.