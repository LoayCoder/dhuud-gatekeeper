

# QA Remediation Plan: Contractor Portal Critical Issues

## Issues Found

### Issue 1: Runtime Error — "Rendered more hooks than during the previous render"
**Severity:** Critical (portal crashes on load)

**Root cause:** The previous code change replaced stub functions (1 hook each) with real implementations (8+ hooks each) in `src/hooks/contractor-management/index.ts`. Hot Module Replacement (HMR) swapped the function reference without remounting the component, causing React to detect a different hook count on re-render.

**Fix:** A hard refresh resolves the HMR issue. However, to prevent it from recurring, the barrel file should not mix re-exports with local hook definitions. The `useInductionVideos` function with its `useQuery` import at line 45-51 sits after the re-exports, which is fine syntactically but creates module initialization complexity. Moving it to a separate file or ensuring clean separation prevents future HMR issues.

**Action:** Extract `useInductionVideos` into its own file `src/hooks/contractor-management/use-induction-videos.ts` and re-export it from the barrel.

### Issue 2: All `contractor_representatives` have `user_id = NULL`
**Severity:** High

No contractor representative has been linked to an auth user — the invitation flow has never been executed. This means `useContractorRepresentative()` (which queries `WHERE user_id = auth.uid()`) always returns `null` for everyone, including actual reps.

**Impact:** Even after fixing the hooks, contractor reps cannot see their own company data. Only admins (via the fallback) can see anything.

**Action:** No code change needed — this is a data/process issue. The admin fallback already handles this for admin users. Contractor reps will get linked when invitations are sent and accepted.

### Issue 3: All `material_gate_passes` have `company_id = NULL`
**Severity:** High

Every gate pass in the database has `company_id` set to `NULL`. The portal query filters by `company_id`, so the Gate Passes page will always show zero results even with correct hooks.

**Action:** No code change for now — the gate passes were created before company_id was added to the table. Existing data needs a backfill migration to set `company_id` based on the project's company. New gate passes created through the portal form already set `company_id`.

### Issue 4: Projects data is sparse
Only 4 companies have projects (2, 2, 1, 3 respectively). The admin fallback picks the first company alphabetically, which may not have projects or workers.

**Action:** No code change — this is test data availability.

## Implementation Plan

### Step 1: Fix barrel file to prevent HMR hook mismatch
Create `src/hooks/contractor-management/use-induction-videos.ts` with the `useInductionVideos` hook, then clean up the barrel file to only have re-exports and type definitions (no hook function bodies).

### Step 2: Backfill gate pass `company_id` from projects
Database migration:
```sql
UPDATE material_gate_passes mgp
SET company_id = cp.company_id
FROM contractor_projects cp
WHERE mgp.project_id = cp.id
  AND mgp.company_id IS NULL
  AND mgp.deleted_at IS NULL;
```

### Step 3: Verify admin fallback loads meaningful data
Ensure the admin fallback query in `useContractorPortalData` picks a company that actually has workers/projects (e.g., company `6b9331ad` with 25 workers, or `668e020b` with 33 workers) rather than just the first alphabetically.

**Change in `use-contractor-portal.ts`:** Order fallback query by worker count or pick a company with active projects.

## Files Changed

| File | Change |
|------|--------|
| `src/hooks/contractor-management/use-induction-videos.ts` | New file — extract `useInductionVideos` hook |
| `src/hooks/contractor-management/index.ts` | Remove inline hook, re-export from new file |
| `src/features/contractors/hooks/use-contractor-portal.ts` | Improve admin fallback to pick company with data |
| Database migration | Backfill `company_id` on `material_gate_passes` |

## Post-Fix Expected State

- Admin users see dashboard with real company data (workers, projects)
- Gate passes page shows backfilled passes for the selected company
- No runtime errors on page load or navigation
- Activity log works (already uses correct imports)
- Contractor reps remain blocked until invitation flow links their `user_id`

