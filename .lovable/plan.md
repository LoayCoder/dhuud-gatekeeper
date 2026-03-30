

# Fix: Complete Button Not Showing for Asset-Mode Area Sessions

## Root Cause

The `can_close_area_session` RPC and `useCompleteAreaSession` hook only check `area_inspection_responses` for progress and failures. But when a session runs in **asset mode** (`execution_mode = 'asset'`), data lives in `inspection_session_assets`, not `area_inspection_responses`. This means:

1. **`can_close_area_session` RPC**: Returns `all_items_responded = false` because it counts area responses (7) vs template items, ignoring the 58 fully inspected session assets.
2. **`useCompleteAreaSession` hook**: Checks `area_inspection_responses` for failures, missing the `not_good`/`partial` results in `inspection_session_assets`.

Result: The "Complete Session" button never appears for asset-mode sessions, and corrective actions can never be created.

## Fix Plan

### 1. Update `can_close_area_session` RPC — Make it mode-aware

Modify the database function to detect `execution_mode`. When mode is `'asset'`:
- Count total from `inspection_session_assets` where `session_id` matches
- Count responded from `inspection_session_assets` where `quick_result IS NOT NULL`
- Check findings/actions from `corrective_actions` linked via `session_id` instead of `area_inspection_findings`

When mode is `'area'` (or null): keep existing logic unchanged.

### 2. Update `useCompleteAreaSession` hook — Make it mode-aware

In `src/hooks/use-session-lifecycle.ts`, before checking failures:
- Fetch the session's `execution_mode`
- If `'asset'`: check `inspection_session_assets` for `not_good`/`partial` results
- If `'area'`: keep existing `area_inspection_responses` check

### Files to Change

| # | File | Change |
|---|------|--------|
| 1 | Database migration | Update `can_close_area_session` RPC to branch on `execution_mode` |
| 2 | `src/hooks/use-session-lifecycle.ts` | Update `useCompleteAreaSession` to check correct table based on execution mode |

