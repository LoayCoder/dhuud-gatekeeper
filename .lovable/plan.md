

# Fix Area Inspection Findings: Display, Input, and Data Recording

## Root Causes Identified

1. **Findings query returns empty** (main bug): The `useAreaFindings` query uses PostgREST FK-hint joins like `profiles!area_inspection_findings_created_by_fkey`, but the `area_inspection_findings` table has **zero foreign key constraints**. PostgREST silently fails, returning no data. This is why the Findings card shows "All (0)" despite findings existing in the database.

2. **Finding auto-close race condition**: When a user changes result from pass to fail, the save mutation first closes any existing finding (pass/na branch), then tries to create a new one. But the dedup check (`SELECT id WHERE response_id = X AND deleted_at IS NULL`) finds the closed finding and skips creation. Result: finding stays closed forever.

3. **No description input**: The FindingsPanel edit dialog only has classification, risk_level, and recommendation fields — no `description` textarea for the inspector to write what they observed.

4. **No manual "Add Finding" button**: Users cannot create ad-hoc findings (e.g., something spotted that isn't tied to a specific checklist item).

5. **GPS/notes/photos not visible on findings**: The checklist response stores GPS/notes/photos, but findings don't surface this data.

## Solution

### 1. Database Migration: Add Missing Foreign Keys
Add FK constraints so PostgREST joins work:

```sql
ALTER TABLE area_inspection_findings
  ADD CONSTRAINT area_inspection_findings_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES profiles(id),
  ADD CONSTRAINT area_inspection_findings_closed_by_fkey 
    FOREIGN KEY (closed_by) REFERENCES profiles(id),
  ADD CONSTRAINT area_inspection_findings_corrective_action_id_fkey 
    FOREIGN KEY (corrective_action_id) REFERENCES corrective_actions(id),
  ADD CONSTRAINT area_inspection_findings_response_id_fkey 
    FOREIGN KEY (response_id) REFERENCES area_inspection_responses(id),
  ADD CONSTRAINT area_inspection_findings_session_id_fkey 
    FOREIGN KEY (session_id) REFERENCES inspection_sessions(id);
```

### 2. Fix Finding Dedup Logic
**File: `src/hooks/use-area-inspections/use-area-inspection-mutations.ts`**

In the fail branch (line 242-263), change the dedup check to exclude closed findings:
```sql
.eq('response_id', responseRecord.id)
.neq('status', 'closed')  -- ADD THIS
.is('deleted_at', null)
```

If no open finding exists, either reopen the closed one or create a new one.

### 3. Add Description Field to Edit Dialog
**File: `src/features/incidents/components/inspections/sessions/FindingsPanel.tsx`**

- Add `description` to the `editForm` state
- Add a `description` textarea field in the edit dialog (before recommendation)
- Pass `description` in the `handleSaveEdit` call

### 4. Add "Add Finding" Button for Manual/Ad-hoc Findings
**File: `src/features/incidents/components/inspections/sessions/FindingsPanel.tsx`**

- Add a "+" button in the FindingsPanel header (next to the filter)
- Opens a dialog with: description, classification, risk_level, recommendation
- Calls `useCreateAreaFinding` with `response_id` set to a placeholder or null (need to make response_id nullable or use a sentinel)
- This requires a DB migration to make `response_id` nullable on `area_inspection_findings`

### 5. Surface GPS/Notes/Photos from Response on Finding Cards
**File: `src/features/incidents/components/inspections/sessions/FindingsPanel.tsx`**

- Extend the `useAreaFindings` query to also fetch `response:area_inspection_responses(notes, gps_lat, gps_lng, photo_paths)` (already joined, just add columns)
- Display GPS coordinates, notes, and photo thumbnails on each finding card
- Update the `AreaFinding` type to include these response fields

### 6. Fix `can_close_area_session` RPC Error
The RPC `can_close_area_session` fails with `column iti.is_active does not exist`. Fix by removing or replacing this column reference in the RPC function.

## Files Changed

1. **Database migration** — Add FK constraints, make `response_id` nullable, fix `can_close_area_session` RPC
2. `src/hooks/use-area-inspections/use-area-inspection-mutations.ts` — Fix dedup logic
3. `src/features/incidents/components/inspections/sessions/FindingsPanel.tsx` — Add description field, manual finding button, show GPS/notes/photos
4. `src/hooks/use-area-findings/types.ts` — Extend `AreaFinding` type with response data
5. `src/hooks/use-area-findings/use-findings-queries.ts` — Add response columns to query
6. Translation files — New keys for add finding dialog

