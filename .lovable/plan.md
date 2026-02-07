
# Dashboard Full Data Integrity and Accuracy Fix

## Executive Summary

This plan addresses critical data integrity issues in the `/incidents/dashboard` (HSSE Event Dashboard) page. Analysis reveals **7 major categories of problems** affecting data accuracy, calculations, and consistency. 

---

## Identified Issues

### Category 1: Database Function Column Mismatches (CRITICAL)

| Function | Issue | Current Column | Actual Column |
|----------|-------|----------------|---------------|
| `get_cross_branch_analytics` | Uses non-existent column | `i.incident_date` | `i.occurred_at` |
| `get_kpi_period_comparison` | Uses non-existent columns | `i.lost_days`, `i.sub_type` | `i.lost_workdays`, `i.subtype` |
| `get_kpi_historical_trend` | Uses non-existent columns | `i.incident_date`, `i.lost_days`, `manhours` table | `i.occurred_at`, `i.lost_workdays`, `manhours` table exists |
| `get_hsse_event_dashboard_stats` | Actions query type mismatch | `EXTRACT(EPOCH FROM (completed_date - start_date))` on integer dates | Need explicit casting to timestamp |
| `get_dashboard_quick_action_counts` | Missing column references | `reported_by`, `investigator_id` | `reporter_id`, needs different approach |

### Category 2: Missing Branch Filtering in RPC Functions

The `get_hsse_event_dashboard_stats` function does **not accept a `p_branch_id` parameter**, but the frontend attempts to pass it:

```typescript
// Current frontend call (FAILS)
supabase.rpc('get_hsse_event_dashboard_stats', {
  p_start_date: ...,
  p_end_date: ...,
  p_branch_id: activeBranchId  // <-- Function doesn't accept this!
});
```

**Result:** 404 error with message: `Could not find the function public.get_hsse_event_dashboard_stats(p_branch_id, p_end_date, p_start_date)`

### Category 3: Severity Level Mismatch

The `get_hsse_event_dashboard_stats` function returns old severity format:

```sql
-- Current (WRONG)
'critical', 'high', 'medium', 'low', 'unassigned'

-- Expected (5-level system)
'level_1', 'level_2', 'level_3', 'level_4', 'level_5', 'unassigned'
```

The frontend `SeverityDistributionChart` expects `level_1` through `level_5`, but receives `critical`, `high`, etc.

### Category 4: Tenant ID Extraction Issues

Several functions fail with "Tenant ID not found in JWT":

```sql
-- get_kpi_historical_trend uses:
SELECT (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::UUID INTO v_tenant_id;

-- Should use the standard helper:
SELECT get_auth_tenant_id() INTO v_tenant_id;
```

### Category 5: Corrective Actions Calculation Errors

The actions query in `get_hsse_event_dashboard_stats` fails because:
- `EXTRACT(EPOCH FROM (completed_date - start_date))` where both are `date` type (not timestamp)
- PostgreSQL cannot extract epoch from date subtraction (which returns integer days)

### Category 6: Frontend-Backend Data Contract Mismatch

| Component | Expected Data | Actual Data Returned |
|-----------|---------------|---------------------|
| `SeverityDistributionChart` | `level_1...level_5` | `critical, high, medium, low` |
| `EnhancedKPIGrid` | `investigations_open/closed` | Not always returned |
| `CrossBranchAnalytics` | `by_location_branch` | Errors due to `incident_date` column |

### Category 7: Inconsistent Data Aggregation

Some queries filter by `created_at`, others by `occurred_at`:

```sql
-- In get_hsse_event_dashboard_stats:
WHERE (p_start_date IS NULL OR created_at >= p_start_date)

-- In frontend hooks:
.gte('occurred_at', startDate.toISOString())
```

This causes mismatches between summary numbers and detailed charts.

---

## Technical Implementation Plan

### Phase 1: Fix Core Database Functions

#### 1.1 Create new `get_hsse_event_dashboard_stats` with branch filtering

```sql
CREATE OR REPLACE FUNCTION public.get_hsse_event_dashboard_stats(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_branch_id UUID DEFAULT NULL  -- NEW parameter
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tenant_id UUID;
  v_result jsonb;
  -- ... declarations
BEGIN
  v_tenant_id := get_auth_tenant_id();
  
  -- Summary with 5-level severity and branch filter
  SELECT jsonb_build_object(
    'total_events', COUNT(*),
    -- ... counts
  ) INTO v_summary
  FROM incidents
  WHERE tenant_id = v_tenant_id 
    AND deleted_at IS NULL
    AND (p_branch_id IS NULL OR branch_id = p_branch_id)  -- Branch filter
    AND (p_start_date IS NULL OR occurred_at >= p_start_date::timestamp)  -- Use occurred_at
    AND (p_end_date IS NULL OR occurred_at < (p_end_date + 1)::timestamp);

  -- Severity distribution with 5-level system
  SELECT jsonb_build_object(
    'level_1', COUNT(*) FILTER (WHERE severity_v2 = 'level_1'),
    'level_2', COUNT(*) FILTER (WHERE severity_v2 = 'level_2'),
    'level_3', COUNT(*) FILTER (WHERE severity_v2 = 'level_3'),
    'level_4', COUNT(*) FILTER (WHERE severity_v2 = 'level_4'),
    'level_5', COUNT(*) FILTER (WHERE severity_v2 = 'level_5'),
    'unassigned', COUNT(*) FILTER (WHERE severity_v2 IS NULL)
  ) INTO v_by_severity
  -- ... rest of query with branch filter
$$;
```

#### 1.2 Fix `get_cross_branch_analytics`

```sql
-- Replace all occurrences of:
i.incident_date 
-- With:
i.occurred_at::date
```

#### 1.3 Fix `get_kpi_period_comparison`

```sql
-- Replace:
COALESCE(SUM(i.lost_days), 0) AS lost_days
i.sub_type = 'near_miss'
-- With:
COALESCE(SUM(i.lost_workdays), 0) AS lost_days
i.subtype = 'near_miss'
```

#### 1.4 Fix `get_kpi_historical_trend`

```sql
-- Replace:
i.incident_date 
i.lost_days
-- With:
i.occurred_at::date
i.lost_workdays
-- Also use get_auth_tenant_id() instead of JWT extraction
```

#### 1.5 Fix `get_dashboard_quick_action_counts`

```sql
-- Replace:
reported_by = v_user_id
-- With:
reporter_id = v_user_id

-- Remove investigator_id reference or use investigation team check
```

#### 1.6 Fix Corrective Actions avg_completion_days calculation

```sql
-- Replace:
AVG(EXTRACT(EPOCH FROM (completed_date - start_date)) / 86400)
-- With:
AVG((completed_date - start_date)) -- Direct day subtraction for date types
```

### Phase 2: Ensure Data Consistency

#### 2.1 Standardize Date Filtering

All queries will use `occurred_at` as the primary date field for event filtering:

```sql
-- Standardized filter pattern:
AND (p_start_date IS NULL OR occurred_at >= p_start_date::timestamp)
AND (p_end_date IS NULL OR occurred_at < (p_end_date + INTERVAL '1 day')::timestamp)
```

#### 2.2 Add Investigation Counts

Add missing investigation tracking to the summary:

```sql
-- Add to get_hsse_event_dashboard_stats:
SELECT jsonb_build_object(
  -- ... existing fields
  'total_investigations', (SELECT COUNT(*) FROM investigations WHERE incident_id IN (SELECT id FROM incidents WHERE tenant_id = v_tenant_id AND deleted_at IS NULL AND ...)),
  'investigations_open', (SELECT COUNT(*) FROM investigations WHERE completed_at IS NULL AND ...),
  'investigations_closed', (SELECT COUNT(*) FROM investigations WHERE completed_at IS NOT NULL AND ...)
)
```

### Phase 3: Frontend Hook Updates

#### 3.1 Update `useHSSEEventDashboard` Hook

No changes needed - already correctly passes `p_branch_id`. The database function just needs to accept it.

#### 3.2 Add Error Boundaries and Fallbacks

Ensure graceful handling when RPC calls fail:

```typescript
// Already exists but verify:
placeholderData: (previousData) => previousData
```

### Phase 4: Validation and Testing

| Validation Check | Method |
|-----------------|--------|
| Chart totals match summary KPIs | Compare `summary.total_events` with sum of `by_event_type` |
| Status distribution sums correctly | `submitted + expert_screening + ... + closed = total_events` |
| Severity distribution sums correctly | `level_1 + level_2 + ... + unassigned = total_events` |
| Branch filtering works | Compare all-branches vs single-branch totals |
| No duplicate counting | Verify same incident not counted in multiple categories |

---

## Files to Modify

### Database Migrations (New File)

`supabase/migrations/[timestamp]_fix_dashboard_data_integrity.sql`

- Fix `get_hsse_event_dashboard_stats` with branch filter and 5-level severity
- Fix `get_cross_branch_analytics` column references
- Fix `get_kpi_period_comparison` column references  
- Fix `get_kpi_historical_trend` column references and tenant extraction
- Fix `get_dashboard_quick_action_counts` column references
- Drop/recreate functions that have signature changes

### No Frontend Changes Required

The frontend already expects the correct data format (5-level severity, branch filtering). Once the database functions are fixed, the dashboard will automatically display correct data.

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Breaking existing functionality | Use `CREATE OR REPLACE` with backward compatibility |
| Data type mismatches | Explicit casting in all SQL queries |
| Tenant isolation breach | All queries use `get_auth_tenant_id()` helper |
| Performance degradation | Add appropriate indexes if needed |

---

## Expected Outcomes

After implementation:

1. All dashboard charts will display real, accurate data from the database
2. Summary numbers will match detailed breakdowns exactly
3. Branch filtering will work correctly across all components
4. 5-level severity system will be properly displayed
5. KPI calculations (TRIR, LTIFR, DART) will use correct column names
6. Cross-branch analytics will function without errors
7. No more 404/400 errors in network requests to RPC functions
