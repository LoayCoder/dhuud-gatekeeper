

# Fix: Worker Project Assignment Not Showing in Approval Dialog

## Problem
The worker "Ahmad Mohammed Al-Harbi" has a `project_id` stored directly on the `contractor_workers` table (project: "Substation B Electrical Installation"), but the approval dialog shows "No project assigned yet". This happens because the `useWorkerProjectAssignment` hook only queries the `project_worker_assignments` junction table, which has no row for this worker. The project was linked at registration but the junction-table insert either failed silently or was added after the worker was created.

## Root Cause
Two sources of project data exist:
1. `contractor_workers.project_id` — set during portal registration
2. `project_worker_assignments` table — junction table for formal assignments

The hook only checks source #2, missing source #1.

## Fix

### 1. Update `useWorkerProjectAssignment` hook
**File:** `src/features/contractors/hooks/use-worker-project-assignment.ts`

Add a fallback: if no `project_worker_assignments` row is found, check the worker's direct `project_id` column on `contractor_workers` and fetch the project name from `contractor_projects`.

```
Step 1: Query project_worker_assignments (existing logic)
Step 2: If null, query contractor_workers.project_id for this worker
Step 3: If project_id exists, fetch contractor_projects(project_name, status)
Step 4: Return the result in the same shape
```

This is a single file change — no UI modifications needed since the dialog already renders `projectData` correctly when it's non-null.

