

# Fix Session Progress — Derive from Real Asset Data

## Problem
The progress card shows "0 of 7" instead of "5 of 58" because:
1. `useSessionProgress` reads counter columns (`inspected_count`, `passed_count`, etc.) from `inspection_sessions` table — but these counters are **never updated** when assets are inspected
2. `AreaSessionWorkspace` hardcodes `passed={assetProgress.total}`, `failed={0}`, `notAccessible={0}` as placeholders

## Solution
Compute progress metrics directly from `inspection_session_assets` rows (the actual source of truth) instead of relying on stale counter columns.

## Changes

### 1. Replace `useSessionProgress` with asset-derived computation
**File:** `src/features/incidents/hooks/use-inspection-sessions/use-inspection-session-queries.ts`

Rewrite `useSessionProgress` to query `inspection_session_assets` directly:
- `total` = count of all session assets
- `inspected` = count where `quick_result IS NOT NULL`
- `passed` = count where `quick_result = 'good'`
- `failed` = count where `quick_result = 'not_good'`
- `not_accessible` = count where `quick_result = 'not_accessible'`
- `compliance_percentage` = `passed / (passed + failed) * 100` (exclude NA and not_accessible)

Returns the same shape (`total_assets`, `inspected_count`, `passed_count`, `failed_count`, `not_accessible_count`, `compliance_percentage`) so existing consumers work unchanged.

### 2. Fix `AreaSessionWorkspace` to pass real data
**File:** `src/pages/inspections/AreaSessionWorkspace.tsx`

Replace the hardcoded placeholders at lines 382-390:
```tsx
// Before (broken):
passed={assetProgress.total}  // ← wrong
failed={0}                     // ← hardcoded
notAccessible={0}              // ← hardcoded

// After (real data):
passed={assetProgress.passed_count}
failed={assetProgress.failed_count}
notAccessible={assetProgress.not_accessible_count}
```

### 3. Also update session counters on each inspection (sync back)
**File:** `src/features/incidents/hooks/use-inspection-sessions/use-session-lifecycle-mutations.ts`

In `useRecordAssetInspection.onSuccess`, after invalidating queries, also update the session-level counters by aggregating from `inspection_session_assets`. This keeps the `inspection_sessions` table in sync for dashboards and reports.

## Files Modified
| File | Change |
|------|--------|
| `use-inspection-session-queries.ts` | Rewrite `useSessionProgress` to derive metrics from `inspection_session_assets` |
| `AreaSessionWorkspace.tsx` | Use real progress fields instead of hardcoded values |
| `use-session-lifecycle-mutations.ts` | Sync session counters after each inspection |

## No Schema Changes
All required columns already exist on both tables.

