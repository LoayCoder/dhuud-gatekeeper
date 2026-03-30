

# Fix: Remove Invalid `deleted_at` Filters on `inspection_session_assets`

## Root Cause

The previous audit rounds added `.is('deleted_at', null)` filters to all `inspection_session_assets` queries as a "defense-in-depth" measure. However, **the `inspection_session_assets` table does not have a `deleted_at` column**. This causes Supabase to either error silently or return zero rows, making all sessions appear to have no assets.

This is why new sessions show "no assets" — the assets are inserted correctly (with `tenant_id`), but every read query filters on a non-existent column.

## Confirmed Schema

The `inspection_session_assets` table columns are:
`id, tenant_id, session_id, asset_id, quick_result, failure_reason, notes, gps_lat, gps_lng, photo_paths, inspected_at, inspected_by, created_at, updated_at, branch_id, asset_name_snapshot, asset_code_snapshot, asset_location_snapshot, asset_type_snapshot`

**No `deleted_at` column exists.**

## Fix Plan

Remove all `.is('deleted_at', null)` calls on queries targeting `inspection_session_assets` across these files:

| # | File | Lines to fix |
|---|------|-------------|
| 1 | `use-inspection-session-queries.ts` | Lines 100, 132, 164, 187 — `useSessionAssets`, `useUninspectedAssets`, `useSessionAssetByAssetId`, `useSessionProgress` |
| 2 | `use-session-parts-progress.ts` | Line 27 — session assets sub-query |
| 3 | `use-session-asset-mutations.ts` | Lines 119, 203 — duplicate check + refresh query |
| 4 | `use-session-lifecycle-mutations.ts` | Lines 246, 294, 304 — sync-back, completion count, parts summary |

Each fix is a single line removal. No other logic changes needed — the `tenant_id` filters remain correct.

