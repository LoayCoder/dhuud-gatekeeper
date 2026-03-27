

# Fix: Inspection Sessions Not Displaying After Creation

## Root Cause

Database investigation reveals **all 3 sessions ever created have `deleted_at` set** — so the listing query (which filters `WHERE deleted_at IS NULL`) returns zero results. Two scenarios explain this:

1. **Old sessions (before rollback code):** Sessions INS-2026-0002 and INS-2026-0003 were created successfully on March 25 (both have `started_at` set), then manually deleted via the delete button or `soft_delete_inspection_session` RPC within seconds.

2. **New attempts (after rollback code):** If `startSession` fails for any reason (RLS on `hsse_assets`, no matching assets, INSERT failure on `inspection_session_assets`), the catch block automatically soft-deletes the session — but **the success toast never fires** (it's in the try block). If the user saw the toast, the session existed momentarily but was deleted afterward.

**The most likely live issue:** The `CreateSessionDialog.onSubmit` navigates to the workspace on success (line 203). If the workspace page encounters an error or the user navigates back, the session list is empty because the session was already deleted by some other mechanism.

## Fix Plan

### 1. Add defensive logging to `onSubmit` (`CreateSessionDialog.tsx`)
Add `console.log` statements before create, after create, before start, after start, and in the catch block to trace exactly where the flow fails in production.

### 2. Remove premature navigation on success
Currently line 203 navigates immediately. If the `invalidateQueries` hasn't resolved yet, the dashboard won't show the new session. Move navigation into an `onSuccess` callback or delay slightly.

### 3. Add a "draft" tab to the dashboard (`InspectionSessionsDashboard.tsx`)
The dashboard only shows tabs for `in_progress`, `completed_with_open_actions`, and `closed` — there's no `draft` tab. If `startSession` fails but `createSession` succeeds (and rollback also fails for some reason), the session sits in `draft` status invisibly.

Add a `draft` tab:
```ts
statusCounts = {
  all: ...,
  draft: allSessions.filter(s => s.status === 'draft').length,
  in_progress: ...,
  ...
};
```

### 4. Fix the `startSession` to not throw on zero assets
Currently if `hsse_assets` returns 0 rows, the code still updates status to `in_progress` with `total_assets: 0`. This is correct. But verify the UPDATE isn't blocked by any RLS policy by adding error details to the catch.

### 5. Improve error reporting in catch block
Replace the generic error handling with structured logging:
```ts
catch (error: unknown) {
  console.error('[CreateSession] Failed:', {
    sessionId: session?.id,
    step: session ? 'startSession' : 'createSession',
    error,
  });
  // ... existing rollback + toast
}
```

## Files Modified

| File | Change |
|------|--------|
| `CreateSessionDialog.tsx` | Add logging, improve error handling |
| `InspectionSessionsDashboard.tsx` | Add `draft` status tab |

## Technical Details

- The `inspection_sessions` SELECT RLS policies are fine (both `get_auth_tenant_id()` and branch-based check work for `branch_id IS NULL`)
- The `inspection_session_assets` INSERT policy requires `has_asset_management_access(auth.uid())` — need to verify the current user has this
- The `hsse_assets` SELECT policy requires branch access — if user has no branch assignment and assets have branch_id set, they'd get 0 results (but that wouldn't cause an error, just 0 assets)

