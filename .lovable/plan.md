

# Fix PTW Project Not Showing After Creation + Double Toast

## Problems Found

### Problem 1: Project created but not visible on Project Mobilization page
**Root cause: Branch filter mismatch in the query service.**

The `getPTWProjects` service (line 37-41 of `ptwProjectService.ts`) does **client-side** branch filtering after fetching data. It checks `project.site?.branch_id` against the user's active branch filter. However, the Supabase select query joins `site:sites(name, branch_id)` — the `branch_id` field must be included in the select for the filter to work.

Looking at the data: the project (id `8439b57f`) has site `Club House` with branch `8a74df12` (RGC). The tenant has two branches: RGC and DGC. If the user's branch selector is set to a specific branch other than RGC, or if `branchIds` returns an empty array, the project gets filtered out.

**Most likely cause**: The user may not be in "All Branches" mode, or the `getBranchFilter()` returns an empty array before branch data loads, causing all projects to be filtered out. The query fires before branch context is ready.

**Fix**: Add `isLoading` check from `useBranchFilter` to the query's `enabled` condition so it waits for branch data to be ready before fetching.

### Problem 2: Double toast on project creation
The `useCreatePTWProject` hook (line 87 in `use-ptw-projects.ts`) fires `toast.success("PTW Project created")`, and then `ProjectFormDialog.tsx` (line 151) also fires `toast.success("Project created successfully")`. This creates **two** success toasts.

**Fix**: Remove the toast from the hook's `onSuccess` since the form dialog already handles success/error messaging.

### Problem 3: "Work permit created" confusion
The user mentions seeing "work permit created" — this is likely because the `useCreatePTWProject` hook toast says "PTW Project created" which may be misread/confused with "PTW permit created." Removing the duplicate toast fixes this.

## Changes

| File | Change |
|------|--------|
| `src/features/ptw/hooks/use-ptw-projects.ts` | Remove duplicate `toast.success` from `useCreatePTWProject` onSuccess. Add branch `isLoading` to `usePTWProjects` enabled condition. |
| `src/features/ptw/hooks/use-ptw-projects.ts` | Import `useBranchFilter`'s `isLoading` and gate query on `!isLoading` |

## Technical Details

In `use-ptw-projects.ts`:

1. Update `usePTWProjects` to wait for branch filter to be ready:
```typescript
const { branchIds, isAllBranchesMode, isLoading: branchLoading, queryKey: branchQueryKey } = useBranchFilter();

return useQuery({
  // ...existing config...
  enabled: !!tenantId && !branchLoading,
});
```

2. Remove toast from `useCreatePTWProject` onSuccess (keep only the query invalidation):
```typescript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ["ptw-projects"] });
  // Toast removed — handled by ProjectFormDialog
},
```

