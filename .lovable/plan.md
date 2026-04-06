

# Fix: Internal PTW Projects Should Not Require Workers

## Problem

When creating a permit for an **internal** PTW project (no contractor linked), the Workers step blocks the user with "No approved workers found" because:

1. `getProjectContextWorkers()` returns `{ project: null }` when `contractor_company_id` is NULL (line 189 of `ptwProjectService.ts`)
2. `PermitWorkersStep` shows a blocking error when no workers are returned
3. `canProceed()` in `CreatePermit.tsx` requires `worker_ids.length > 0` and `permit_holder_id`
4. The schema (`permitSchema.ts`) requires `worker_ids: z.array(z.string()).min(1)`

Internal projects have no contractor workers — the team is internal staff. Worker selection should be **optional** for internal projects.

## Plan

### 1. Update `PermitWorkersStep` to handle internal projects

- Accept `is_internal_work` prop (derived from the selected project)
- When internal: show an info banner explaining workers are optional, and allow the user to proceed without selecting any
- When contractor: keep current mandatory behavior

### 2. Update `CreatePermit.tsx` step validation

- Fetch the selected project's `is_internal_work` flag
- For internal projects, skip the worker requirement in `canProceed()` case 2
- Pass `is_internal_work` to `PermitWorkersStep`

### 3. Update `permitSchema.ts`

- Change `worker_ids` from `.min(1)` to `.default([])` (allow empty array)
- Change `permit_holder_id` from `.min(1)` to `.optional()`
- Validation enforcement moves to `canProceed()` (only required for contractor projects)

### 4. Update `getProjectContextWorkers` in `ptwProjectService.ts`

- Also select `is_internal_work` from the project
- For internal projects, return empty workers array with `project` still populated (not null), so the UI can distinguish "internal with no workers" from "contractor with no workers"

## Files Changed

| File | Change |
|------|--------|
| `src/pages/ptw/permitSchema.ts` | Make `worker_ids` and `permit_holder_id` optional |
| `src/pages/ptw/CreatePermit.tsx` | Fetch project `is_internal_work`, skip worker validation for internal |
| `src/features/ptw/components/wizard/PermitWorkersStep.tsx` | Accept `is_internal_work` prop, show optional UI for internal projects |
| `src/features/ptw/services/ptwProjectService.ts` | Return project even when `contractor_company_id` is null (for internal projects) |
| `src/features/ptw/hooks/use-project-context-workers.ts` | Expose `is_internal_work` flag from query |

