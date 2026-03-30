
# Fix: Corrective Action UI Not Appearing After Completing Asset-Mode Inspection Sessions

## What I verified

For session `INS-2026-0004`:

- It is an **asset-mode area session**
- It has **58/58 responded assets**
- It still has **5 failed assets** (`not_good` / `partial`)
- It is currently marked **`closed`**
- It has **0 corrective_actions** created

So the user is right: the flow is not complete yet.

## Root causes

### 1. Failed-assets query is broken in the UI
`SessionActionsPanel` correctly tries to show the corrective action button after completion, but `useSessionFailedAssets` still does this:

```ts
.from('inspection_session_assets')
...
.is('deleted_at', null)
```

`inspection_session_assets` does **not** have a `deleted_at` column. That means the failed-assets query can fail/return nothing, so:

- `hasFailures` becomes false
- `Create Corrective Action` button never appears
- the dialog for creating the action is never reachable

This is the main UI bug.

### 2. The close RPC now allows asset-mode sessions to close too early
The new `can_close_area_session` function checks asset-mode findings only from `corrective_actions`:

- if there are no actions yet, `open_findings = 0`
- then `can_close = true`
- so the session can be moved directly to `closed`

That breaks the intended workflow, because failed assets should keep the session in `completed_with_open_actions` until actions are created and resolved.

### 3. The status message is misleading
The toast/message says the session is closed and actions can be handled, but in reality the workflow should remain in the “open actions” phase until corrective actions exist and are resolved.

## Implementation plan

### 1. Fix `useSessionFailedAssets`
File:
- `src/features/incidents/hooks/use-inspection-actions/use-session-failed-assets.ts`

Change:
- remove the invalid `.is('deleted_at', null)` on `inspection_session_assets`
- keep tenant + session + `quick_result in ('not_good', 'partial')`

Result:
- failed assets will load again
- `SessionActionsPanel` will detect failures
- the **Create Corrective Action** button/dialog will appear

### 2. Fix asset-mode close logic in `can_close_area_session`
File:
- new migration updating `public.can_close_area_session(uuid)`

For `execution_mode = 'asset'`:
- derive whether failed assets exist from `inspection_session_assets`
- if failed assets exist **and no corrective actions exist yet**, `can_close` must be `false`
- `open_findings` / `pending_actions` should represent:
  - unhandled failed assets when no action exists yet
  - open corrective actions once actions are created
- only allow close when:
  - all assets are responded, and
  - all failed assets are covered/resolved through the corrective action workflow

Result:
- asset-mode sessions stay in `completed_with_open_actions`
- users are forced through the action workflow before true closure

### 3. Prevent misleading post-complete behavior in the workspace
Files:
- `src/hooks/use-session-lifecycle.ts`
- possibly `src/features/incidents/components/inspections/sessions/SessionCompletionDialog.tsx`
- possibly `src/features/incidents/components/inspections/sessions/SessionStatusCard.tsx`

Adjust:
- ensure complete action for asset mode sets `completed_with_open_actions` whenever failed assets exist
- update wording so users understand:
  - “Session completed”
  - “Corrective actions are required before closing”

Result:
- status and UI messaging match the actual workflow

### 4. Verify `SessionActionsPanel` stays visible for asset-mode area sessions
File:
- `src/pages/inspections/AreaSessionWorkspace.tsx`

This panel is already mounted, which is good. After fixing the failed-assets hook, it should work. I would still verify:
- it renders for `completed_with_open_actions`
- it also renders when reopening/refreshing the session page
- the create-action dialog opens with failed asset context

### 5. Data repair for already-closed broken sessions
Because `INS-2026-0004` is already incorrectly `closed`, add a small remediation step:

- update affected asset-mode sessions that:
  - are `closed`
  - have failed assets
  - have no corrective actions
- set them back to `completed_with_open_actions`

This can be done as a one-time migration/data-fix for existing bad records.

## Files likely to change

1. `src/features/incidents/hooks/use-inspection-actions/use-session-failed-assets.ts`
2. `src/hooks/use-session-lifecycle.ts`
3. `src/features/incidents/components/inspections/sessions/SessionStatusCard.tsx`
4. `src/features/incidents/components/inspections/sessions/SessionCompletionDialog.tsx` (if message text is adjusted)
5. new migration for `can_close_area_session`
6. optional data-fix migration for already-closed invalid sessions

## Expected outcome

After this fix:

- completing an asset-mode session with failures will move it to `completed_with_open_actions`
- the workspace will show the failed-assets-driven corrective action UI
- the user can open **Create Corrective Action**
- the session cannot be truly closed until those actions are handled
- already broken sessions like `INS-2026-0004` can be restored to the correct state
