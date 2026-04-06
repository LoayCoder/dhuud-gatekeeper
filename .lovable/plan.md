

# Contractor Portal Projects Page — Gap & Silent Failure Audit

## Issues Found

### 1. **CRASH: `end_date` can be null** (Critical)
The `ContractorPortalProject` type defines `end_date: string | null`, but the page calls `format(new Date(project.end_date), "PP")` directly on line 56. If `end_date` is null, `new Date(null)` produces an invalid date and `format()` throws an error, crashing the card.

**Fix:** Add a null guard: show "Ongoing" or similar when `end_date` is null.

### 2. **No error state handling** (Silent Failure)
`useContractorPortalData()` returns `isError` but the Projects page never checks it. If the query fails, the page silently shows "No projects assigned" instead of an error message — misleading the user.

**Fix:** Add an error state before the empty check, showing a card with a retry-friendly error message.

### 3. **Missing status cases in badge** (Minor)
The `getStatusBadge` function handles `active`, `completed`, `on_hold` but the admin side uses `planned` and `cancelled` statuses too. These fall to the `default` case showing raw status text without proper styling.

**Fix:** Add `planned` and `cancelled` cases.

### 4. **Project manager shows placeholder text**
In `useContractorPortalProjects`, the `project_manager` field is hardcoded to `{ full_name: "Project Manager" }` instead of fetching the actual name via a join. This is a data gap — though the Projects page doesn't display the manager name, it would be wrong if it ever did.

**Fix:** Add a profiles join to the query: `project_manager:profiles!contractor_projects_project_manager_id_fkey(full_name)`.

### 5. **No project detail view** (Feature Gap)
Unlike workers (which now have a detail modal), clicking a project card does nothing. There's no way to see project details like notes, site, branch, or assigned workers.

**Fix (optional, noted as gap):** Add a click handler to open a project detail dialog — but this can be deferred if not in scope.

## Plan

### File: `src/pages/contractor-portal/Projects.tsx`

| Change | Detail |
|--------|--------|
| Add error state | Check `isError` from `useContractorPortalData()`, show error card with message |
| Guard `end_date` null | Wrap date format in conditional: `project.end_date ? format(...) : t("common.ongoing", "Ongoing")` |
| Add missing status badges | Add `planned` (blue/info) and `cancelled` (destructive) cases |

### File: `src/features/contractors/hooks/use-contractor-portal.ts`

| Change | Detail |
|--------|--------|
| Fix project manager join | Replace placeholder with actual join: `project_manager:profiles!contractor_projects_project_manager_id_fkey(full_name)` |
| Remove manual mapping | Remove the `.map()` that adds fake project_manager data |

### Summary of changes
- 2 files modified
- No new files, no DB changes
- Fixes 1 crash, 1 silent failure, 1 data quality issue, 1 cosmetic gap

