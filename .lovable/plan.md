

# Fix Area Inspection: Add Submit Confirmation & Finding Recording

## Problems Identified

1. **No Submit/Confirm Button**: Checklist items auto-save individually, but there's no visible "Submit All" or confirmation step. Users complete all items but have no clear indication they're done or a way to confirm submission.

2. **Findings Not Recorded**: When a checklist item is marked "Fail", no finding is created. The `useCreateAreaFinding` hook exists but is never called from the checklist UI. The FindingsPanel only shows when findings exist, but nothing creates them.

## Solution

### 1. Auto-Create Finding on Fail Result
**File: `src/features/incidents/components/inspections/sessions/AreaChecklistItem.tsx`**

- Import `useCreateAreaFinding` from `@/hooks/use-area-findings`
- When a user clicks "Fail" and the response is saved successfully, automatically call `createFinding.mutateAsync({ session_id, response_id })` to create an `area_inspection_finding` with default classification `observation` and risk `medium`
- Show a small "Finding Recorded" badge on the card when a finding exists for that response
- Add a "Create Finding" button for manual finding creation (visible when result is fail but no finding exists yet — handles edge cases)

### 2. Add Checklist Summary & Confirm Bar
**File: `src/pages/inspections/AreaSessionWorkspace.tsx`**

- Add a sticky bottom bar (inside the area checklist section) that shows:
  - Progress summary: "X/Y items answered"
  - Count of failures: "Z findings"
  - A **"Complete Inspection"** button that opens the existing `SessionCompletionDialog`
- The bar appears only when session is `in_progress` and in area mode
- The Complete button is enabled only when all required items have been answered (`progress.responded === progress.total`)

### 3. Show FindingsPanel Always (When in_progress)
**File: `src/pages/inspections/AreaSessionWorkspace.tsx`**

- Change the FindingsPanel visibility condition: show it when session is `in_progress` or has findings, not only when `findingsCount > 0`. This lets users see findings as they're auto-created from failed items.

### 4. Translation Keys
**Files: `en/translation.json`, `ar/translation.json`**

- `inspections.findingRecorded` — "Finding Recorded"
- `inspections.createFinding` — "Create Finding"  
- `inspections.completeInspection` — "Complete Inspection"
- `inspections.answeredCount` — "{{answered}}/{{total}} answered"
- `inspections.findingsCount` — "{{count}} findings"

## Technical Details

- `useCreateAreaFinding` already deduplicates (checks if finding exists for `response_id` before inserting)
- Finding auto-creation triggers after the `saveResponse.mutateAsync` succeeds with a `fail` result
- The response `id` is needed for finding creation — it's returned from the save mutation and stored in the `response` prop
- Query invalidation on `['area-findings', sessionId]` and `['area-findings-count', sessionId]` keeps the FindingsPanel and progress in sync

## Files Changed
1. `src/features/incidents/components/inspections/sessions/AreaChecklistItem.tsx` — auto-create finding on fail + finding badge
2. `src/pages/inspections/AreaSessionWorkspace.tsx` — sticky confirm bar + FindingsPanel visibility
3. `src/locales/en/translation.json` — new keys
4. `src/locales/ar/translation.json` — new keys

