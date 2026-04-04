

# Fix: Full Branch Access Not Working + Branch/Roles Display

## Root Cause

The `AuthContext.fetchProfile` query (line 80 of `AuthContext.tsx`) does NOT select `has_full_branch_access` or `is_super_admin`:

```
.select('id, full_name, avatar_url, tenant_id, preferred_language, assigned_branch_id, assigned_site_id, assigned_department_id, contractor_company_name, is_deleted, is_active')
```

This means `BranchContext` always evaluates `hasFullBranchAccess` as `false`, so:
- Users with "Full Access to All Branches" are treated as single-branch users
- The branch switcher doesn't show "All Branches" option
- Frontend queries filter by the user's (null) assigned branch, hiding DGC companies
- The User Management table shows "-" for branch because the RPC returns NULL `branch_name` for full-access users (since `assigned_branch_id` is NULL by design)

## Plan

### Step 1: Add missing columns to AuthContext profile query
Add `has_full_branch_access` and `is_super_admin` to the `.select()` in `AuthContext.tsx` line 80.

### Step 2: Update RPC to show branch info for full-access/multi-branch users
Modify `get_users_with_roles_paginated` to:
- Return `'All Branches'` as `branch_name` when `has_full_branch_access = true`
- For users with multiple branch assignments (via `user_branch_assignments`), aggregate branch names

### Step 3: Update table UI for "All Branches" display
In `UserManagementTable.tsx` line 114, show "All Branches" badge when `has_full_branch_access` is true instead of "-".

## Files Changed

| File | Change |
|------|--------|
| `src/contexts/AuthContext.tsx` | Add `has_full_branch_access, is_super_admin` to select |
| DB migration | Update `get_users_with_roles_paginated` RPC |
| `src/pages/admin/UserManagement/UserManagementTable.tsx` | Show "All Branches" badge |

## Impact
- Full-access users will see all branches' data (including GBR DGC)
- Branch column will show "All Branches" instead of "-"
- Multi-branch users will see their assigned branch names
- No security changes — RLS already handles this correctly via `can_access_branch()`

