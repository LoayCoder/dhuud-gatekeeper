

# Project Form: Branch-First Cascading Filters + Auto-Generated Code

## Summary
Restructure the "Add Project" form so Branch is selected first, then all downstream fields (Site, Company, Project Manager, Department) filter based on the selected branch. The Project Code field becomes auto-generated with the pattern `{BRANCH_CODE}-{YEAR}-{SERIAL}` and is read-only.

## Changes

### 1. `ProjectFormDialog.tsx` — Reorder fields & add cascading logic

**Field order** (matching the reference image):
1. **Branch** * (first field, required)
2. **Site** (filtered by branch)
3. **Company** * (filtered by branch via `assigned_branch_id`)
4. **Project Manager** * (filtered: profiles linked to the branch)
5. **Department** (filtered by branch, including hybrid `branch_id=null`)
6. **Code** * (auto-generated, read-only)
7. **Project Name** *
8. **Start Date** * / **End Date** *
9. **Notes**

**Cascading reset logic** — when branch changes:
- Reset `site_id`, `company_id`, `project_manager_id`, `department_id`
- Regenerate `project_code`

**Company filtering**: Filter the `companies` array by `assigned_branch_id === watchedBranchId`.

**Project Manager filtering**: Filter `managers` by branch. We'll need to update `useProjectManagers` to accept an optional `branchId` param and join `user_branch_assignments` to filter by branch.

**Auto-generated code logic**:
- Find selected branch name from branches array
- Build: `{BRANCH_SHORT}-{YYYY}-{NNN}` where `NNN` is a zero-padded serial
- Query existing projects with same prefix to determine next serial number
- Set `project_code` via `form.setValue()` whenever branch changes
- Make the Code input `readOnly`

### 2. `use-project-managers.ts` — Add branch filtering

Add optional `branchId` parameter. When provided, join `user_branch_assignments` to only return managers assigned to that branch:

```sql
profiles.id, profiles.full_name, profiles.email
FROM profiles
INNER JOIN user_branch_assignments ON profiles.id = user_branch_assignments.user_id
WHERE user_branch_assignments.branch_id = branchId
  AND user_branch_assignments.deleted_at IS NULL
  AND profiles.tenant_id = tenantId
  AND profiles.is_active = true
```

### 3. `projectFormSchema.ts` — Make branch_id required

Change `branch_id` from optional to required: `z.string().min(1, 'Branch is required')`.

### 4. Auto-code generation helper

Create a small async function `generateProjectCode(branchName: string, tenantId: string)`:
- Builds prefix: first 3 chars of branch name uppercased + `-` + current year
- Queries `contractor_projects` for `project_code LIKE '{prefix}%'` count
- Returns `{prefix}-{(count+1).toString().padStart(3, '0')}`

## Files

| File | Change |
|------|--------|
| `projectFormSchema.ts` | Make `branch_id` required |
| `ProjectFormDialog.tsx` | Reorder fields, add company/manager branch filtering, auto-generate code |
| `use-project-managers.ts` | Add optional `branchId` filter with `user_branch_assignments` join |

No database changes needed — all data relationships already exist.

