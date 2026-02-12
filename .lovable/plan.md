

## Fix: Incident Metrics Card Not Reflecting Real Data

### Problems Identified

**Problem 1: Severity chart is empty because classification logic doesn't match actual data**
The `useIncidentMetricsBySeverity` hook classifies incidents using `injury_classification` or `subtype`. However, the database shows `injury_classification` is NULL for every record, and the actual `subtype` values (`utility_outage`, `fall_from_height`, `slip_trip_fall_same_level`, `equipment_damage`, etc.) don't match any of the hardcoded switch cases (`fatality`, `lost_time`, `restricted_work`, `medical_treatment`). Only `near_miss`, `first_aid`, and `environmental` have matches. This causes most incidents to be uncounted, resulting in an empty chart.

**Problem 2: Observations are mixed into incident metrics**
Neither `useIncidentMetricsBySeverity` nor `useIncidentFrequencyTrend` filter by `event_type = 'incident'`. The database has 113 observations vs 23 incidents. The frequency trend shows ~110+ events because it includes observations, giving a misleading count for "Incident Frequency."

**Problem 3: Branch filter race condition**
Same pattern as the recently fixed Recent Events bug -- the hooks don't wait for `useBranchFilter()` to finish loading before executing queries.

### Data Reality

```text
Total records: 137 (23 incidents, 114 observations)
All injury_classification values: NULL
Incident subtypes: utility_outage(15), fall_from_height(2), near_miss(1),
                   equipment_damage(1), first_aid(1), environmental(1),
                   slip_trip_fall_same_level(1), unauthorized_access(1)
```

### Fix Plan

**File: `src/hooks/use-incident-metrics.ts`**

1. Add `isLoading` from `useBranchFilter()` and gate both queries with `enabled: !branchLoading`

2. In `useIncidentMetricsBySeverity`:
   - Add `.eq('event_type', 'incident')` filter to exclude observations
   - Expand the switch statement to map real subtypes to severity categories:
     - `fall_from_height`, `slip_trip_fall_same_level` -> `lost_time_injury` (or appropriate category)
     - `utility_outage` -> classify as `environmental` or a general bucket
     - `equipment_damage` -> `vehicle_equipment`
     - `unauthorized_access` -> `security`
   - Add a catch-all that increments an "other/unclassified" counter so no incident is silently dropped

3. In `useIncidentFrequencyTrend`:
   - Add `.eq('event_type', 'incident')` filter to count only incidents, not observations

**File: `src/components/incidents/dashboard/IncidentMetricsCard.tsx`**

4. Update the severity chart and categories to handle the "unclassified" bucket so incidents that don't fit predefined categories are still visible rather than silently lost

### Detailed Changes

**`use-incident-metrics.ts` -- Both hooks:**
```text
Line 30: Add isLoading
  Before: const { branchIds, isAllBranchesMode, queryKey: branchQueryKey } = useBranchFilter();
  After:  const { branchIds, isAllBranchesMode, isLoading: branchLoading, queryKey: branchQueryKey } = useBranchFilter();

Add event_type filter to both queries:
  .eq('event_type', 'incident')

Add enabled condition to both queries:
  enabled: !branchLoading
```

**`use-incident-metrics.ts` -- Severity classification (expanded switch):**
```text
Add new cases:
  'fall_from_height', 'slip_trip_fall_same_level', 'struck_by' -> lost_time_injury
  'utility_outage' -> environmental  
  'equipment_damage' -> vehicle_equipment
  'unauthorized_access' -> security
  default -> near_miss (catch-all for unclassified)

Remove the double-counting logic at lines 109-115 that adds to 
environmental/security based on event_type (since we now filter to 
event_type='incident' only and handle subtypes properly)
```

**`use-incident-metrics.ts` -- Frequency trend (line 130):**
```text
Same isLoading + event_type filter additions
```

### Expected Results After Fix

- "Incidents by Severity" chart will show real data (23 incidents classified by subtype)
- "Incident Categories" badges will show correct counts (Environmental: 1+15, Vehicle/Equipment: 1, Security: 1)
- "Incident Frequency Trend" will show only incident counts (~18 in Jan, ~5 in Feb) instead of inflated numbers including observations
- Branch filter will work correctly from first load

### Files Changed

- `src/hooks/use-incident-metrics.ts` (branch loading gate, event_type filter, expanded classification)

