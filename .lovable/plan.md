

# Fix Full Branch Access Audit Issues

## Two Issues to Fix

### 1. Clean Up Stale Branch Assignments (Database)

Two users have `has_full_branch_access = true` but still have active records in `user_branch_assignments`. These legacy records should be soft-deleted for data consistency.

**Migration SQL:**
```sql
UPDATE public.user_branch_assignments
SET deleted_at = NOW()
WHERE user_id IN (
  SELECT id FROM public.profiles
  WHERE has_full_branch_access = true
)
AND deleted_at IS NULL;
```

Additionally, add a trigger so that whenever `has_full_branch_access` is set to `true` on a profile, any active `user_branch_assignments` for that user are automatically soft-deleted -- preventing future inconsistencies.

### 2. Fix Hybrid Department Filtering in UserFormDialog.tsx

In `UserFormDialog.tsx` (line ~306), when a multi-branch user selects branches, departments with `branch_id = null` (shared/hybrid departments) are excluded from the dropdown because `null` is never found in the `selectedBranchIds` array.

**Fix:** Update the filter to also include departments where `branch_id` is null:
```typescript
// Before
depts = depts.filter((d) => selectedBranchIds.includes(d.branch_id));

// After
depts = depts.filter((d) => !d.branch_id || selectedBranchIds.includes(d.branch_id));
```

### 3. Add Audit Logging for Full Access Toggle

When `has_full_branch_access` is toggled on or off, this is a critical privilege change. The existing `useAdminAuditLog` hook already tracks user updates with change detection via `detectUserChanges`, and `has_full_branch_access` is not currently in the tracked fields list.

**Fix:** Add `has_full_branch_access` to the `fieldsToTrack` array in `use-admin-audit-log.ts` so this change is captured in audit logs.

## Files Modified

1. **New migration file** -- Soft-delete stale branch assignments + add cleanup trigger
2. **`src/components/admin/users/UserFormDialog.tsx`** -- Fix hybrid department filter (line ~306)
3. **`src/hooks/use-admin-audit-log.ts`** -- Add `has_full_branch_access` to tracked fields

