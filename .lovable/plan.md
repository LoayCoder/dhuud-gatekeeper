

# Fix: Action Detail Sheet — Translation Error, Missing Context & Summary

## Problems Identified

1. **Translation Error (visible in screenshot):** `t('actions.timeline')` returns an object `{ assigned, inProgress, pendingVerification, closed }` instead of a string. The text "key 'actions.timeline (en)' returned an object instead of string" renders literally on screen.

2. **No Failure Context / Asset Details:** The `failure_context_snapshot` (JSONB) is stored on every inspection action during creation (containing failed asset names, codes, locations, failed parts, and inspector notes), but it is never fetched by the queries nor displayed in the Action Detail Sheet. The assignee has no idea what assets failed or what needs fixing.

3. **Missing Action Summary:** No summary section explaining the scope of work — the assignee sees only a title and description but no structured breakdown of what went wrong.

## Root Causes

| Issue | Root Cause |
|-------|-----------|
| Translation error | `actions.timeline` is a nested object in `translation.json` (line 3039). Code at `ActionDetailSheet.tsx:188` calls `t('actions.timeline')` expecting a string. |
| No context data | Neither `useMyInspectionActions` nor `getMyCorrectiveActions` selects `failure_context_snapshot` from `corrective_actions`. |
| No context UI | `ActionDetailSheet.tsx` has no section to render the failure context snapshot. |

## Implementation Plan

### File 1: `src/locales/en/translation.json`
- Rename nested `actions.timeline` object to `actions.timelineSteps` (used nowhere else currently)
- Add `actions.timeline` as a simple string: `"timeline": "Timeline"`
- Add new keys: `actions.failureContext`, `actions.failedAssets`, `actions.failedParts`, `actions.inspectorNotes`, `actions.noDetailsAvailable`

### File 2: `src/locales/ar/translation.json`
- Same structural fix for Arabic translations

### File 3: `src/features/incidents/hooks/use-inspection-actions/use-action-queries.ts`
- Add `failure_context_snapshot` to the `useMyInspectionActions` select clause

### File 4: `src/features/incidents/services/incidentQueryService.ts`
- Add `failure_context_snapshot` to the `getMyCorrectiveActions` select clause

### File 5: `src/pages/incidents/MyActions/types.ts`
- Add `failure_context_snapshot` field to `ActionForDialog` interface

### File 6: `src/pages/incidents/MyActions/ActionDetailSheet.tsx`
- Add a **Failure Context** section between the description and the status grid
- Render each failed asset as a compact card showing: asset code, asset name, location, quick result badge, failure reason, failed parts list, and inspector notes
- Only show this section when `failure_context_snapshot` exists and has entries
- Use HSSE color coding (red for not_good, amber for partial)

## Expected Result
- Translation error gone — "Timeline" header renders as text
- Assignee sees full structured breakdown of failed assets, their locations, what parts failed, and why
- Reviewer sees the same context when verifying actions

