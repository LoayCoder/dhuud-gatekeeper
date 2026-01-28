

# Comprehensive Reporting Health Check - Issues Found

## Summary

After thorough analysis of the database schema, functions, and frontend code, I found **multiple critical issues** that are causing errors in both Incident and Observation reporting.

---

## Critical Database Issues Found

### Issue 1: `reported_by` Column Does Not Exist
**Affected Tables:** `incidents`
**Correct Column:** `reporter_id`

The `incidents` table uses `reporter_id`, but several database functions and frontend code use the non-existent `reported_by` column.

**Evidence from postgres logs:**
```
ERROR: column incidents.reported_by does not exist
ERROR: column "reported_by" does not exist
```

---

### Issue 2: `observations` Table Does Not Exist
**Reality:** Observations are stored in the `incidents` table with `event_type = 'observation'`

Several database functions query a non-existent `observations` table.

---

### Issue 3: `closed_at` Column Does Not Exist in Incidents
**Affected Tables:** `incidents`
**Reality:** The `incidents` table uses `closure_approved_at` for closure tracking

**Evidence from postgres logs:**
```
ERROR: column "closed_at" does not exist
```

---

### Issue 4: `assigned_to` Column Does Not Exist in Incidents
**Affected Tables:** `incidents`
**Reality:** Investigation assignment is tracked in the `investigations` table with `investigator_id` or `team_leader_id`

---

## Affected Database Functions

| Function Name | Issue | Required Fix |
|---------------|-------|--------------|
| `get_my_reporting_stats` | Uses `reported_by` and queries `observations` table | Change to `reporter_id` and `incidents` with `event_type` filter |
| `get_anonymous_leaderboard` | Queries `observations` table | Query `incidents` with `event_type = 'observation'` |
| `get_dashboard_quick_action_counts` | Uses `reported_by` | Change to `reporter_id` |
| `has_confidentiality_access` | Uses `reported_by` and `assigned_to` | Change to `reporter_id` and join `investigations` table |
| `get_user_badge_stats` | Queries `observations` table | Query `incidents` with `event_type = 'observation'` |

---

## Affected Frontend Files

| File | Issue | Required Fix |
|------|-------|--------------|
| `src/components/dashboard/personal/RecentActivityFeed.tsx` | Uses `.eq('reported_by', userId)` and queries `observations` table | Change to `reporter_id` and query `incidents` with `event_type` filter |
| `src/lib/offline-report-sync.ts` | Inserts with `reported_by: user_id` | Change to `reporter_id: user_id` |

---

## Implementation Plan

### Step 1: Fix Database Functions (Priority: CRITICAL)

#### 1.1 Fix `get_my_reporting_stats`
```sql
CREATE OR REPLACE FUNCTION public.get_my_reporting_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- ... existing declarations ...
BEGIN
  -- Replace all occurrences of:
  --   reported_by → reporter_id
  --   FROM observations → FROM incidents WHERE event_type = 'observation'
  
  -- Example fix:
  SELECT COUNT(*) INTO v_my_incidents
  FROM incidents
  WHERE reporter_id = v_user_id  -- Changed from reported_by
    AND tenant_id = v_tenant_id
    AND event_type = 'incident'  -- Added filter
    AND deleted_at IS NULL;
  
  SELECT COUNT(*) INTO v_my_observations
  FROM incidents
  WHERE reporter_id = v_user_id  -- Changed from reported_by
    AND tenant_id = v_tenant_id
    AND event_type = 'observation'  -- Changed from observations table
    AND deleted_at IS NULL;
  -- ... rest of function with same pattern ...
END;
$$;
```

#### 1.2 Fix `get_anonymous_leaderboard`
Replace all `FROM observations` with `FROM incidents WHERE event_type = 'observation'` and `reported_by` with `reporter_id`.

#### 1.3 Fix `get_dashboard_quick_action_counts`
Change `reported_by` to `reporter_id`.

#### 1.4 Fix `has_confidentiality_access`
Change `reported_by` to `reporter_id` and handle `assigned_to` by joining with `investigations` table to check `investigator_id` or `team_leader_id`.

#### 1.5 Fix `get_user_badge_stats`
Replace `FROM observations` queries with `FROM incidents WHERE event_type = 'observation'` and change `reported_by` to `reporter_id`.

---

### Step 2: Fix Frontend Code

#### 2.1 Fix `RecentActivityFeed.tsx` (Lines 34-52)
```typescript
// Before (broken):
.eq('reported_by', userId)
client.from('observations')

// After (fixed):
.eq('reporter_id', userId)
client.from('incidents').eq('event_type', 'observation')
```

#### 2.2 Fix `offline-report-sync.ts` (Line 205)
```typescript
// Before (broken):
reported_by: user_id,

// After (fixed):
reporter_id: user_id,
```

---

## Technical Summary

### Database Functions to Update (5 functions):
1. `get_my_reporting_stats` - Full rewrite with correct columns
2. `get_anonymous_leaderboard` - Replace observations table queries
3. `get_dashboard_quick_action_counts` - Fix reported_by → reporter_id
4. `has_confidentiality_access` - Fix reported_by and assigned_to references
5. `get_user_badge_stats` - Replace observations table queries

### Frontend Files to Update (2 files):
1. `src/components/dashboard/personal/RecentActivityFeed.tsx`
2. `src/lib/offline-report-sync.ts`

---

## Risk Assessment

| Change | Risk | Impact |
|--------|------|--------|
| Fix database functions | Medium | All reporting stats will work correctly |
| Fix frontend queries | Low | Activity feed and offline sync will work |
| Remove observations table references | Medium | Must ensure all queries use correct pattern |

---

## Expected Outcome

After implementation:
- No more `column does not exist` errors
- Reporting statistics will display correctly
- Activity feeds will show user's incidents and observations
- Offline sync will work properly
- Leaderboard and badge stats will be accurate

