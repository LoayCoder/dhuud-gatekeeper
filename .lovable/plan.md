

# Session-Level Corrective Action Workflow

## Summary
Add a "Create Corrective Action" button to the `SessionActionsPanel` that is enabled only when the session is completed and has failed assets. The action creation dialog auto-loads all failed assets as read-only context, then reuses the existing `corrective_actions` table and action workflow.

## Database Changes

### 1. Add `failure_context_snapshot` column to `corrective_actions`
A JSONB column to store a snapshot of failed assets at action creation time.

```sql
ALTER TABLE corrective_actions 
ADD COLUMN IF NOT EXISTS failure_context_snapshot jsonb DEFAULT NULL;
```

No other schema changes needed — `session_id`, `source_type`, `status`, verification fields all exist.

## File Changes

### 1. New: `CreateSessionActionDialog.tsx`
**Path:** `src/features/incidents/components/inspections/sessions/CreateSessionActionDialog.tsx`

- **Props:** `open`, `onOpenChange`, `sessionId`, `failedAssets` (array of `{ id, asset_code, name, location, failed_parts, comments }`)
- **Step 1 — Failed Assets Summary (read-only):** Scrollable list showing each failed asset with its code, name, location, failed parts summary, and inspector comments
- **Step 2 — Action Form:** Reuses the same form fields as `CreateActionFromFindingDialog` (title, description, assigned_to, responsible_department, due_date, priority, action_type, category) plus AI suggestion button
- **On Submit:** Inserts into `corrective_actions` with `session_id`, `source_type: 'inspection'`, `status: 'assigned'`, and `failure_context_snapshot` containing the full failed assets snapshot. Sends assignment email notification via existing edge function.

### 2. New: `useCreateSessionAction.ts`
**Path:** `src/features/incidents/hooks/use-inspection-actions/use-create-session-action.ts`

- Mutation hook that inserts a `corrective_action` record with:
  - `session_id`, `tenant_id`, `source_type: 'inspection'`
  - `failure_context_snapshot`: JSONB snapshot of all failed assets
  - Standard fields: title, description, assigned_to, due_date, priority, etc.
- Sends assignment email via `send-action-email` edge function
- Invalidates `session-actions`, `session-closure-status` query keys

### 3. New: `useSessionFailedAssets.ts`
**Path:** `src/features/incidents/hooks/use-inspection-actions/use-session-failed-assets.ts`

- Query hook that fetches all `inspection_session_assets` where `quick_result IN ('not_good', 'partial')` for the session
- Joins asset details (code, name, building/location)
- Joins `asset_inspection_part_results` to get failed parts summary per asset
- Returns structured data for the dialog

### 4. Modify: `SessionActionsPanel.tsx`
- Add props: `sessionStatus`, `hasFailures` (or compute internally)
- Import and render `CreateSessionActionDialog`
- Add a "Create Corrective Action" button:
  - Visible when `sessionStatus` is `completed_with_open_actions` or `closed`
  - Disabled if no failed assets exist
  - Opens `CreateSessionActionDialog` with auto-loaded failed asset data
- Show action counter badge (e.g., "2 Actions (1 Open)")

### 5. Modify: `AreaSessionWorkspace.tsx`
- Pass `sessionStatus={session.status}` to `SessionActionsPanel`
- No other changes needed — the panel handles the rest

### 6. Export updates
- Export new dialog and hooks from barrel files (`sessions/index.ts`, `use-inspection-actions/index.ts`)

## Existing Infrastructure Reused (No Changes)
- `corrective_actions` table (already has `session_id`, `source_type`, verification fields)
- `useSessionActions` query (already fetches actions by session_id)
- `ActionVerificationDialog` (verify/reject workflow)
- `useVerifyAction` mutation (close/return actions)
- `useUpdateInspectionActionStatus` (assignee status updates)
- `MyInspectionActions` page (assignee view)
- `send-action-email` edge function (notifications)
- Action Center integration (already queries `corrective_actions`)

## No Changes to
- `AssetPartInspectionCard`, `QuickInspectionCard` — inspection flow unchanged
- `CreateActionFromFindingDialog` — remains for per-finding actions in area mode
- Action Center, dashboards — already consume `corrective_actions` table

