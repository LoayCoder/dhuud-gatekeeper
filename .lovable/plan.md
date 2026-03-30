
# Fix plan: inspection corrective action flow is only partially fixed

## What I verified
I checked the live session UI for `INS-2026-0004`.

Current state is now:
- Session status shows **Completed (Actions Pending)**
- Session actions panel is visible
- **Create Corrective Action** button is visible
- Backend state is correct:
  - session = `completed_with_open_actions`
  - responded assets = `58/58`
  - failed assets = `5`
  - corrective actions = `0`
  - close RPC returns `can_close = false`

So the old gating/status problem is fixed.

## What is still broken
The remaining blocker is the **creation flow itself**:

When I click **Create Corrective Action**, the page crashes into **“Page Failed to Load”**.  
That means the user is no longer blocked by session status — they are blocked by the **CreateSessionActionDialog / action creation path**.

## Implementation plan

### 1. Stabilize the Create Corrective Action dialog
File:
- `src/features/incidents/components/inspections/sessions/CreateSessionActionDialog.tsx`

Changes:
- Replace the inline dialog data-loading logic with safer query-based loading patterns already used elsewhere
- Add explicit loading / error UI for assignees and departments
- Defensively normalize `failedAssets` before rendering the summary
- Prevent the entire page from crashing if dialog data is incomplete

Result:
- Clicking **Create Corrective Action** opens a usable dialog instead of breaking the page

### 2. Harden inspection action creation mutation
File:
- `src/features/incidents/hooks/use-inspection-actions/use-create-session-action.ts`

Changes:
- Add `.throwOnError()` to inserts/selects so permission or RLS failures are surfaced properly
- Include any required session metadata when creating the action, especially session branch context if needed
- Return and toast the real error message instead of only a generic failure
- Keep the `failure_context_snapshot` as the canonical inspection-action payload

Result:
- If creation fails, the user sees the real reason
- If creation succeeds, the action record is fully usable by the rest of the workflow

### 3. Verify the action loop is actually integrated
Files to audit/update:
- `src/features/incidents/hooks/use-inspection-actions/use-action-queries.ts`
- `src/features/incidents/hooks/use-inspection-actions/use-action-mutations.ts`
- related action-center / my-actions inspection views

Checks/fixes:
- Created session actions must appear immediately in the session panel
- Assigned inspection actions must appear in the assignee’s action views
- Verification/closure path must update session closure status correctly
- Confirm the identity used for `assigned_to` is consistent across:
  - insert
  - list queries
  - update queries
  - permission checks

Result:
- The full corrective-action lifecycle works, not just the button

### 4. Add missing defensive UX around this flow
Files:
- `CreateSessionActionDialog.tsx`
- `SessionActionsPanel.tsx`
- possibly `SessionStatusCard.tsx`

Changes:
- Show a clear inline error if dialog support data cannot load
- Show success feedback and immediate refresh after create
- Keep the session in **Completed - Actions Pending** until actions are handled
- Make the wording clearer that the next required step is corrective action creation

Result:
- Users understand what to do next and do not get stuck on silent failures

### 5. End-to-end verification after fix
I would verify this exact path:
1. Open session `INS-2026-0004`
2. Click **Create Corrective Action**
3. Confirm dialog opens without crashing
4. Create one corrective action
5. Confirm it appears in **Session Actions**
6. Confirm session still shows open findings until the action is progressed/resolved
7. Confirm the assignee can see and work the action

## Technical details
Most likely remaining root cause is in the **dialog/action creation layer**, not session completion logic.

Evidence:
- `useSessionFailedAssets` is now returning failures correctly
- `SessionActionsPanel` renders correctly
- live UI already shows the create button
- session/backend status is now correct
- crash happens specifically when the create dialog opens

Secondary deep issue to verify while fixing:
- inspection corrective actions use the shared `corrective_actions` system, so the assignment identity and query filters must match the rest of the action workflow exactly, otherwise creation may work but downstream action handling will still look broken

## Files most likely to change
1. `src/features/incidents/components/inspections/sessions/CreateSessionActionDialog.tsx`
2. `src/features/incidents/hooks/use-inspection-actions/use-create-session-action.ts`
3. `src/features/incidents/hooks/use-inspection-actions/use-action-queries.ts`
4. `src/features/incidents/hooks/use-inspection-actions/use-action-mutations.ts`
5. possibly a small backend migration if branch/permission metadata is missing for inspection-created actions

## Expected outcome
After this fix:
- the user can open the corrective action dialog
- create corrective actions from failed inspection assets
- see those actions inside the session immediately
- continue the normal action workflow without the page crashing
- only close the inspection after corrective actions are properly handled
