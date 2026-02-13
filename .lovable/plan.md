

## Add Year Filter + YTD Logic + Branch-Based Filtering

### Overview

Replace the existing KPI date range dropdown (Week/Month/30 Days/90 Days/YTD) with a **Year selector** that automatically applies YTD logic. Remove the Site filter from the KPI section. All dashboard sections will respond to the selected Year and Branch.

---

### How It Works

**Year Selection Logic:**
- Default = Current Year (2026)
- Dynamic year list generated from 2023 to current year
- If selected year = current year: filter from Jan 1 to today
- If selected year = past year: filter full year (Jan 1 to Dec 31)

**Branch Filtering:**
- Keep the existing Branch dropdown
- Remove the Site dropdown from the KPI filter bar
- Stop passing `siteId` to KPI hooks and chart components
- All components receive `branchId` and the year-derived date range

**Export:**
- Both KPI Export and Dashboard Export will reflect the selected year and branch

---

### Technical Changes

**File: `src/pages/incidents/HSSEEventDashboard.tsx`** (Main dashboard page)

1. Replace `kpiDateRange` state (`'week' | 'month' | '30days' | '90days' | 'ytd'`) with `selectedYear` state (number, default = current year)
2. Replace the `kpiStartDate/kpiEndDate` memo to use year-based YTD logic:
   ```
   if selectedYear === currentYear:
     start = Jan 1 of currentYear
     end = today
   else:
     start = Jan 1 of selectedYear
     end = Dec 31 of selectedYear
   ```
3. Replace the KPI date range `<Select>` with a Year `<Select>` (dynamically listing 2023 through current year)
4. Remove the Site `<Select>` from the KPI filter bar
5. Remove `siteId` from all KPI hook calls (`useLaggingIndicators`, `useLeadingIndicators`, `useResponseMetrics`, `usePeopleMetrics`, `useDaysSinceLastRecordable`)
6. Remove `siteId` from chart component props (`IncidentMetricsCard`, `ObservationTrendChart`, `ObservationRatioBreakdown`)
7. Update `useKPIHistoricalTrend` call to pass the year-derived start/end dates instead of `undefined`
8. Update `useKPIPeriodComparison` to use a year-appropriate comparison (current year vs previous year)
9. Update both export components to reflect year + branch (no site)
10. Pass year-derived dates to `CrossBranchSummaryCard`, `CrossBranchAnalytics`, `CrossBranchHeatmap`, and `ResidualRiskCard` so they also reflect the selected year
11. Update the general `DateRangeFilter` and its `startDate/endDate` state to also be driven by the selected year (so event distribution, trend analysis, location analytics, and observations sections all use the same year filter)

**File: `src/components/incidents/dashboard/DateRangeFilter.tsx`**

- This filter controls the non-KPI sections (Event Distribution, Trends, Location, Observations). It currently defaults to "Last 30 Days."
- Remove this component from the header. The year selector in the KPI filter bar will serve as the single source of truth for all sections.

**File: `src/components/incidents/dashboard/KPIDashboardExport.tsx`**

- Update to show the selected year in the export metadata instead of the old date range format

**File: `src/components/incidents/dashboard/DashboardExportDropdown.tsx`**

- Update filter summary to show year and branch (drop site reference)

**No backend/RPC changes needed** -- all RPCs already accept `p_start_date` and `p_end_date` parameters, and `p_site_id` is optional (NULL = no filter). The change is purely frontend: we compute the correct date range from the selected year and stop passing site IDs.

---

### What Changes for the User

| Before | After |
|--------|-------|
| KPI filters: Week / Month / 30d / 90d / YTD | KPI filters: Year dropdown (2023-2026) |
| Separate date range filter in header for charts | Removed -- everything uses selected year |
| Site filter in KPI bar | Removed |
| Charts may show different date range than KPIs | All sections use same year + branch |
| Export may not match visible data | Export precisely matches selected year + branch |

---

### Files Modified

- `src/pages/incidents/HSSEEventDashboard.tsx` -- Main orchestration (year state, remove site, unify date range)
- `src/components/incidents/dashboard/DashboardExportDropdown.tsx` -- Update filter summary
- `src/components/incidents/dashboard/KPIDashboardExport.tsx` -- Update date range display

### Files Removed (from usage, not deleted)

- `DateRangeFilter` component will no longer be rendered in the dashboard (component file stays for potential reuse elsewhere)

