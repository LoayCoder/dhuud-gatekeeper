

# Fix: Both Area & Asset Inspection Session Types

## Problems Identified

1. **`useStartSession` never branches on `session_type`** — It always queries `hsse_assets` and inserts into `inspection_session_assets`. For area/audit sessions, this either errors (0 matching assets) or does the wrong thing entirely. Area sessions need to pre-create `area_inspection_responses` rows from template items instead.

2. **Area progress query missing `deleted_at` filter** — `useAreaChecklistProgress` (line 140) queries `area_inspection_responses` without `.is('deleted_at', null)`, so soft-deleted responses inflate counts.

3. **Session Status card shows infinite spinner** — The `SessionStatusCard` uses `closureStatus` which likely fails or returns null for sessions that weren't properly initialized, causing the loading spinner seen in the screenshot.

## Changes

### 1. `use-session-lifecycle-mutations.ts` — Branch `useStartSession` on `session_type`

Add `session_type` and `template_id` to the session SELECT (line 48). Then:

- **If `session_type === 'area'` or `'audit'`:**
  - Fetch `inspection_template_items` for the session's `template_id`
  - Insert one `area_inspection_responses` row per template item (with `result: null`)
  - Set `total_assets` = number of checklist items
  - Skip the `hsse_assets` query entirely

- **If `session_type === 'asset'` (or default):**
  - Keep existing asset-population logic unchanged

### 2. `use-area-inspection-queries.ts` — Add `deleted_at` filter

Line 140: Add `.is('deleted_at', null)` to the responses query in `useAreaChecklistProgress`.

### 3. No UI changes needed

Both `AreaSessionWorkspace` and `SessionWorkspace` are already correctly wired — they just need the backend initialization to work properly for each session type.

## Files Modified

| File | Change |
|------|--------|
| `src/features/incidents/hooks/use-inspection-sessions/use-session-lifecycle-mutations.ts` | Add `session_type` + `template_id` to query; branch area vs asset initialization |
| `src/hooks/use-area-inspections/use-area-inspection-queries.ts` | Add `.is('deleted_at', null)` to responses query (line 140) |

