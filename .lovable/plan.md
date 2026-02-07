
# Fix Leading Indicators Progress Bar and Data Accuracy

## Problems Identified

### Problem 1: Visual Progress Bar Bug
The `LeadingIndicatorsCard` component uses a double-layered progress bar approach that creates visual artifacts:

1. A `<Progress>` component with a primary-colored indicator
2. An overlapping absolute-positioned `<div>` with status color on top

When values are 0%, the `rounded-full` styling on both elements creates a small visible bar even though the width should be 0%.

### Problem 2: Data Calculation Issues

**Corrective Actions Mismatch:**
- UI shows "0/4 closed" 
- Database has 5 actions created in the last month
- The RPC function logic is inconsistent: it counts actions created in the date range for `v_actions_closed`, but counts ALL actions with `due_date <= p_end_date` for `v_actions_due`

**Hazard Count Slight Discrepancy:**
- UI shows "36 hazards identified"
- Database has 38 unsafe_condition observations in the last month
- Minor discrepancy likely due to timing/branch filtering

---

## Technical Implementation Plan

### Fix 1: Simplify Progress Bar Rendering

**File:** `src/components/incidents/dashboard/LeadingIndicatorsCard.tsx`

Remove the redundant double-layer approach. Use only the `<Progress>` component with dynamic indicator color based on status.

```text
Current (problematic):
1. <Progress value={...} className="h-2" />
2. <div className="absolute ... statusColors[status]" style={{width: ...}} />

Fixed (single layer):
1. <Progress value={...} className="h-2" indicatorClassName={statusColors[status]} />
```

However, since the `Progress` component doesn't support `indicatorClassName`, we need to either:
- **Option A:** Update the `Progress` component to accept a custom indicator class
- **Option B:** Remove the `<Progress>` and use only the colored `<div>` with proper zero-value handling

**Recommended: Option A** - Add `indicatorClassName` prop to the Progress component for flexibility.

### Fix 2: Fix `get_leading_indicators` RPC Function - Actions Query

**Migration:** Update the actions query to use consistent date filtering

```sql
-- Current (inconsistent):
SELECT 
  COUNT(*) FILTER (WHERE status IN ('verified', 'closed')),
  COUNT(*) FILTER (WHERE due_date <= p_end_date)  -- BUG: Not filtered by created_at
INTO v_actions_closed, v_actions_due
FROM corrective_actions
WHERE ...
  AND created_at >= p_start_date
  AND created_at <= p_end_date;

-- Fixed (consistent):
SELECT 
  COUNT(*) FILTER (WHERE status IN ('verified', 'closed')),
  COUNT(*)  -- Total actions in date range (for "closed out of total" ratio)
INTO v_actions_closed, v_actions_total
FROM corrective_actions
WHERE ...
  AND created_at >= p_start_date
  AND created_at <= p_end_date;
```

### Fix 3: Handle Zero Values in Progress Bar

Add explicit handling for 0% values to prevent visual artifacts:

```typescript
// Ensure width is truly 0 when value is 0
const progressValue = indicator.value === 0 ? 0 : 
  (indicator.isPercentage 
    ? indicator.value 
    : Math.min((indicator.value / indicator.maxValue) * 100, 100));
```

---

## Files to Modify

### 1. `src/components/ui/progress.tsx`
- Add optional `indicatorClassName` prop to allow custom indicator colors
- This enables status-based coloring without double-layering

### 2. `src/components/incidents/dashboard/LeadingIndicatorsCard.tsx`
- Remove the redundant absolute-positioned `<div>` overlay
- Use the enhanced `Progress` component with `indicatorClassName`
- Add explicit zero-value handling

### 3. Database Migration
- Fix `get_leading_indicators` function to use consistent filtering for actions
- Ensure `v_actions_due` counts actions created within the date range, not all-time

---

## Expected Results

After implementation:
1. Progress bars will show no visual artifact when values are 0%
2. Progress bar colors will correctly reflect status (success/warning/critical)
3. Action counts will match database reality (e.g., "0/5 closed" instead of "0/4")
4. Hazard counts will accurately reflect the filtered date range
5. Single-layer progress bar reduces DOM complexity

---

## Validation Checklist

| Check | Expected Result |
|-------|-----------------|
| 0% values show empty bar | No visible bar element |
| 50% values show half-filled bar | Correct width with status color |
| Status colors work | Success/warning/critical colors display |
| Action counts match DB | Numbers match corrective_actions query |
| Hazard counts match DB | Numbers match observations query |
