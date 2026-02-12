## Fix: Historical Trend (12 Months) Chart Not Showing Data

### Root Cause

The `get_kpi_historical_trend` database function references **non-existent** columns and tables:

1. `**incidents.is_lost_time**` -- This column does NOT exist. Only `is_recordable` and `lost_workdays` exist.
2. `**manhour_entries**` table -- This table does NOT exist at all. The function tries to join against it for manhour data.

When the RPC executes, these missing references cause it to error out, returning no data to the chart.

### Fix

Update the `get_kpi_historical_trend` database function to work with actual schema:

1. **Replace `is_lost_time**` with a derived condition: `lost_workdays > 0` (an incident with lost workdays is effectively a lost-time incident)
2. **Remove the `manhour_entries` subquery** and use a fixed default of 200,000 manhours (the standard OSHA basis) until a manhour tracking table is created
3. **DART cases**: Use `is_recordable = true AND lost_workdays > 0` (already correct pattern, just needs the `is_lost_time` removal)

### SQL Migration

```sql
CREATE OR REPLACE FUNCTION get_kpi_historical_trend(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_branch_id UUID DEFAULT NULL,
  p_site_id UUID DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_tenant_id UUID;
  v_result jsonb;
  v_start DATE;
  v_end DATE;
BEGIN
  v_tenant_id := get_auth_tenant_id();
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Tenant ID not found';
  END IF;

  v_start := COALESCE(p_start_date, CURRENT_DATE - INTERVAL '12 months');
  v_end := COALESCE(p_end_date, CURRENT_DATE);

  SELECT COALESCE(jsonb_agg(...), '[]') INTO v_result
  FROM (
    SELECT 
      ...
      -- Changed: is_lost_time -> lost_workdays > 0
      COUNT(*) FILTER (WHERE i.lost_workdays > 0) as lost_time_incidents,
      -- Removed: manhour_entries subquery (table doesn't exist)
      -- Uses fixed 200000 default
      200000 as total_manhours,
      ...
    FROM incidents i
    WHERE ...
  ) monthly_data;

  RETURN v_result;
END;
$$;
```

### Changes Summary


| Issue               | Before (broken)                               | After (fixed)            |
| ------------------- | --------------------------------------------- | ------------------------ |
| Lost-time incidents | `i.is_lost_time = true` (column missing)      | `i.lost_workdays > 0`    |
| Manhours            | Subquery to `manhour_entries` (table missing) | Fixed default `200000`   |
| DART cases          | References `is_lost_time`                     | Uses `lost_workdays > 0` |


### Files Changed

- **Database migration**: Replace the `get_kpi_historical_trend` function with corrected column/table references

### Expected Result

After the fix, the chart will display monthly bars for TRIR, LTIFR, DART, and Severity Rate based on actual incident data (23 incidents across Jan-Feb 2026).