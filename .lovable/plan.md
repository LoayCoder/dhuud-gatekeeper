

# Add Project Assignment + Validation to Worker Form

## Overview

Add a company-filtered project assignment dropdown, real-time duplicate national ID validation, and auto-managed system fields to the worker registration form.

## Changes

### 1. Database: Add `project_id` column to `contractor_workers`

Add an optional `project_id` FK column so workers are linked to a project at creation time. This is separate from the `project_worker_assignments` junction table (used for multi-project assignments later) — this captures the **primary** project during registration.

```sql
ALTER TABLE public.contractor_workers 
  ADD COLUMN project_id uuid REFERENCES public.contractor_projects(id);
```

### 2. Update `ContractorWorkerForm.tsx`

**Project Assignment dropdown (Work Details section):**
- Import `useContractorPortalProjects` from the existing portal hook
- Fetch projects filtered by `companyId` (already implemented in that hook)
- Render a `Select` dropdown showing only active/planned projects for the worker's company
- Auto-set `expiry_date` from selected project's `end_date`
- Make project assignment required in the schema

**Real-time duplicate National ID check:**
- Import `useCheckDuplicateNationalId` 
- On national ID blur/change (debounced), check for duplicates
- Show inline error if duplicate found (alongside blacklist check)

**Schema updates:**
- Add `project_id: z.string().min(1, "Project is required")` to the zod schema
- Make `worker_role` required (already has default, add `.min(1)`)

**Auto-managed fields (hidden, set in mutation):**
- `created_by` — already handled via `submitted_by` in the hook
- `created_at` — database default
- Worker ID — auto-generated UUID
- Status — set to "pending" by the mutation

### 3. Update `useContractorPortalCreateWorker` in `use-contractor-portal.ts`

- Accept `project_id` in mutation data type
- Include `project_id` in insert payload
- After worker creation, auto-insert into `project_worker_assignments` to create the relational link
- Set `submitted_by` from `auth.getUser()` (already partially done)

### 4. Pass projects data to `Workers.tsx`

- The `useContractorPortalData` already provides projects — no change needed
- Pass `companyId` to form (already done)

### Files Modified

| File | Change |
|------|--------|
| Migration SQL | Add `project_id` column to `contractor_workers` |
| `ContractorWorkerForm.tsx` | Add project dropdown, duplicate ID validation, make project/role required |
| `use-contractor-portal.ts` | Accept `project_id`, auto-create `project_worker_assignments` row |

### Technical Notes

- Project dropdown uses existing `useContractorPortalProjects(companyId)` — strict company isolation already enforced by the query's `.eq("company_id", companyId)`
- Duplicate check uses existing `useCheckDuplicateNationalId()` with debounce
- Mobile responsiveness maintained via existing `grid-cols-1 md:grid-cols-2` pattern
- Expiry date auto-populated from project `end_date` but editable

