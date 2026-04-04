

# Fix: App Loading + Branch/Roles Showing "-"

## Two Issues

### Issue 1: App Fails to Load (503 on module)
The Vite dev server is returning 503 for `ptw.routes.tsx` due to stale HMR timestamps. The WebSocket connection also fails (503). This needs a clean server restart by deleting `node_modules/.vite` and making a change to `vite.config.ts` (config changes force full server restarts, unlike source file changes which only trigger HMR).

### Issue 2: Branch & Roles Columns
After investigating the database, the data IS correct — users like LUAY IBRAHIM have `branch_name = RGC` and multiple roles (admin, manager, etc.), while some users (Abdullah Alazwari, Faisal Alsaleh) genuinely have no branch and only `normal_user` role (which is filtered out, showing "-"). The RPC `get_users_with_roles_paginated` returns this data correctly.

However, there may be a timing issue: the app isn't loading at all right now, so we can't verify the table rendering. Once Issue 1 is fixed, we need to verify.

## Plan

### Step 1: Force clean Vite restart
- Delete `node_modules/.vite/` entirely
- Add `optimizeDeps.force: true` temporarily in `vite.config.ts` to force dependency re-optimization on next start
- Bump the version comment in `src/App.tsx` line 1 to `v6`

### Step 2: Verify Branch/Roles display after app loads
Once the app loads, check if Branch and Roles render correctly. If they still show "-", investigate the RPC response in the browser network tab.

### Step 3 (if needed): Add fallback display for users with `has_full_branch_access`
Users with `has_full_branch_access = true` may not have a specific `assigned_branch_id`. The table should show "All Branches" instead of "-" for these users. This is a display improvement.

## Summary
- 1 config change to force Vite restart
- 1 comment bump to trigger rebuild
- Cache cleanup
- Verify Branch/Roles display once app loads

