

# Fix: Empty Dropdowns in Project Creation Form

## Root Causes Found

### 1. Company Dropdown — Empty
The `filteredCompanies` filter on line 114 requires `assigned_branch_id === watchedBranchId`. However, 9 of 22 active companies have `assigned_branch_id = NULL`, so they're excluded entirely. Companies without a branch assignment should still appear (they're not branch-restricted).

### 2. Project Manager Dropdown — Empty
`useProjectManagers(branchId)` queries `user_branch_assignments` with a Supabase join: `.select("user_id, profiles!inner(id, full_name, email)")`. But there is **no foreign key** from `user_branch_assignments.user_id` to `profiles.id` in the database. PostgREST cannot resolve the join, so it returns empty results silently (the hook uses `as any` to bypass TypeScript errors).

### 3. Department Not Auto-Filled
No auto-fill logic exists in `ProjectFormDialog.tsx`. When a Project Manager is selected, nothing happens to the Department field. The `profiles` table has an `assigned_department_id` column that should be used.

## Fixes

### Step 1: Add missing FK — `user_branch_assignments.user_id → profiles.id`
Database migration to add the foreign key so PostgREST can resolve the join.

```sql
ALTER TABLE public.user_branch_assignments
  ADD CONSTRAINT user_branch_assignments_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
```

### Step 2: Fix `useProjectManagers` — use explicit two-step query as fallback
Even with the FK, update the hook to be more resilient: query `user_branch_assignments` for user IDs, then fetch profiles separately. This avoids relying on PostgREST relationship inference.

### Step 3: Fix Company filtering — include NULL branch companies
In `ProjectFormDialog.tsx`, change `filteredCompanies` to include companies where `assigned_branch_id` is null OR matches the selected branch:

```typescript
const filteredCompanies = useMemo(() => {
  if (!watchedBranchId) return [];
  return companies.filter((c: any) => 
    !c.assigned_branch_id || c.assigned_branch_id === watchedBranchId
  );
}, [companies, watchedBranchId]);
```

### Step 4: Add Department auto-fill on PM selection
Fetch the selected PM's `assigned_department_id` from profiles and auto-fill the department field:

```typescript
// Watch project_manager_id changes
const watchedPMId = form.watch("project_manager_id");

useEffect(() => {
  if (!watchedPMId) return;
  // Fetch PM's department from profiles
  supabase.from("profiles")
    .select("assigned_department_id")
    .eq("id", watchedPMId)
    .maybeSingle()
    .then(({ data }) => {
      if (data?.assigned_department_id) {
        form.setValue("department_id", data.assigned_department_id);
      }
    });
}, [watchedPMId]);
```

## Summary

| Step | File | Change |
|------|------|--------|
| 1 | Migration | Add FK `user_branch_assignments.user_id → profiles.id` |
| 2 | `use-project-managers.ts` | Rewrite branch-filtered query to use two-step approach |
| 3 | `ProjectFormDialog.tsx` | Include null-branch companies in filter |
| 4 | `ProjectFormDialog.tsx` | Auto-fill department on PM selection |

