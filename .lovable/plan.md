

# Fix: Backfill Missing Checklist Responses for Already-Started Area Sessions

## Root Cause

Session `9c865bff-...` was started **before** the area/audit branching fix was deployed. The old `useStartSession` code populated `inspection_session_assets` (the asset table) instead of `area_inspection_responses` (the checklist table). Result:

- Template has **6 checklist items** → only **2 response rows** exist
- `total_assets` is **58** (asset count) instead of **6** (checklist item count)
- The UI shows nothing useful because the checklist data is incomplete

## Plan

### 1. Add a self-healing check in `AreaSessionWorkspace`

When the page loads and the session is `in_progress`, compare the count of `area_inspection_responses` against `inspection_template_items`. If items are missing:

- Insert the missing response rows (for template items that don't yet have a response)
- Update `total_assets` on the session to match the template item count
- Invalidate queries so the UI refreshes

This runs once on mount, fixing any pre-existing sessions without requiring manual intervention.

### 2. File changes

| File | Change |
|------|--------|
| `src/hooks/use-area-inspections/use-area-inspection-mutations.ts` (or new hook file) | Add `useBackfillAreaResponses` mutation that inserts missing response rows and corrects `total_assets` |
| `src/pages/inspections/AreaSessionWorkspace.tsx` | Call the backfill hook on mount when session is `in_progress` and response count < template item count |

### 3. Backfill logic (pseudocode)

```text
1. Fetch template_items for session.template_id (where deleted_at IS NULL)
2. Fetch existing response template_item_ids for this session
3. Compute missing = template_items - existing_response_items
4. If missing.length > 0:
   a. INSERT missing rows into area_inspection_responses
   b. UPDATE inspection_sessions SET total_assets = template_items.length
   c. Invalidate queries
```

### 4. No database migration needed

All tables already exist with the correct schema. This is purely a frontend data-repair mechanism.

