

## Add Month Filter to the Dashboard Filter System

### Overview

Extend the previously approved Year + Branch filter system with a **Month dropdown**, allowing users to drill into a specific month within a selected year. This adds finer-grained time control while maintaining the same synchronized architecture.

---

### Filter Bar Layout

```text
[ Year v ]  [ Month v ]  [ Branch v ]  [ Export ]  [ Refresh ]
```

| Filter | Behavior |
|--------|----------|
| **Year** | Dynamic from DB (distinct years from incidents). Default = latest year. |
| **Month** | "All Months" (default) + Jan-Dec. When "All Months" is selected, YTD/full-year logic applies. When a specific month is selected, date range narrows to that month only. |
| **Branch** | Existing branch selector. |

### Month Logic

- **Year = current year, Month = "All"**: YTD (Jan 1 to today)
- **Year = current year, Month = specific (e.g. March)**: Mar 1 to min(Mar 31, today) -- clamp to today if month is current or future
- **Year = past year, Month = "All"**: Full year (Jan 1 to Dec 31)
- **Year = past year, Month = specific**: Full month (e.g. Mar 1 to Mar 31)
- **Month = future month in current year**: Disabled in dropdown (cannot select months that haven't started yet)

When the Year changes, Month resets to "All Months".

---

### Implementation Details

**New hook: `src/hooks/use-incident-years.ts`**
- Fetches `SELECT DISTINCT EXTRACT(YEAR FROM occurred_at)::int AS year FROM incidents WHERE deleted_at IS NULL ORDER BY year DESC`
- Returns array of years for the dropdown

**Dashboard state changes (`HSSEEventDashboard.tsx`):**
- Add `selectedYear` state (default: current year or latest from data)
- Add `selectedMonth` state (default: `'all'`)
- Remove `DateRangeFilter` component from header
- Remove `kpiDateRange` dropdown from KPI filters row
- Remove Site filter dropdown
- Compute `startDate`/`endDate` from year + month selection using `useMemo`
- All 18 hooks receive the same computed `startDate`, `endDate`, and `branchId`

**Month dropdown population:**
- Months 1-12 rendered using date-fns `format(new Date(year, monthIndex, 1), 'MMMM')` with locale awareness for Arabic
- For the current year, months after the current month are disabled
- "All Months" option always available

**Files to create:**
- `src/hooks/use-incident-years.ts`

**Files to modify:**
- `src/pages/incidents/HSSEEventDashboard.tsx` -- Major refactor: replace DateRangeFilter and kpiDateRange with Year + Month + Branch selectors; unify all hook calls
- `src/components/incidents/dashboard/DashboardExportDropdown.tsx` -- Add year/month to filter summary
- `src/components/incidents/dashboard/KPIDashboardExport.tsx` -- Add year/month to export metadata
- `src/components/incidents/dashboard/DaysSinceCounter.tsx` -- Add NaN/Infinity guard

**No database migration needed** -- the year query uses existing indexed columns.

### Date Computation Logic (pseudocode)

```text
if month === 'all':
  startDate = Jan 1 of selectedYear
  endDate = (selectedYear === currentYear) ? today : Dec 31 of selectedYear
else:
  startDate = 1st of selectedMonth in selectedYear
  endDate = min(lastDayOfMonth, today)  // clamp to today if current/future
```

### What Gets Removed

1. `DateRangeFilter` component from header
2. `kpiDateRange` state and its Select dropdown
3. Site filter Select dropdown
4. `siteId` state (all calls pass `undefined`)

### What Gets Added

1. Year dropdown (dynamic from DB)
2. Month dropdown (locale-aware, with disabled future months)
3. Unified date computation from Year + Month
4. Year/Month labels in export metadata

