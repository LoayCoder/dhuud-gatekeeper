

## Fix: "Days Since Last Recordable Injury" Showing Infinity

### Root Cause

The database function `get_days_since_last_recordable` returns `999` when no recordable injuries are found. The `DaysSinceCounter` component then renders this as the infinity symbol (`∞`) on line 50.

This is by design but gives a confusing user experience. There are no recordable injuries in the database for the current tenant/branch, so the system shows infinity instead of a meaningful message.

### Fix

**File: `src/components/incidents/dashboard/DaysSinceCounter.tsx`**

Replace the `999 = ∞` display logic with a user-friendly "No Recordable Injuries" state:

- When `days === 999`: show a Shield icon (green), display **"0"** as the counter value, and add a subtitle: **"No Recordable Injuries"** (translatable)
- Remove the infinity symbol entirely
- Keep the green emerald styling to indicate a positive safety status
- Hide the milestone progress bar (already done for 999)

**File: `src/pages/incidents/HSSEEventDashboard.tsx`** (line 384)

Change the fallback from `daysSince ?? 0` to `daysSince ?? 999` so that a loading/null state defaults to the "no injuries" state rather than falsely showing "0 days since last injury."

### Technical Detail

```text
DaysSinceCounter.tsx changes:

Line 50 (counter display):
  Before: {days === 999 ? '∞' : days}
  After:  {days === 999 ? '0' : days}

After line 55 (label), add conditional subtitle:
  If days === 999: show "No Recordable Injuries" text in emerald color

HSSEEventDashboard.tsx line 384:
  Before: days={daysSince ?? 0}
  After:  days={daysSince ?? 999}
```

### Acceptance Criteria

- No infinity symbol displayed anywhere
- No NaN or blank values
- When no recordable injuries: shows "0" with "No Recordable Injuries" subtitle in green
- When recordable injuries exist: shows correct day count with milestone progress
- Works with branch/site filters
- All text translatable (i18n keys added)

