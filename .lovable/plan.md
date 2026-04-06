

# PTW Module Deep Audit — Issues, Gaps & Fixes

## Critical Finding: Complete Stub File Blocking All PTW Functionality

**`src/hooks/ptw/index.ts` is a stub file that returns empty arrays for every hook.** This is the single biggest issue — it means the entire PTW module is non-functional for most pages:

- `usePTWTypes()` → returns `[]` (no permit types shown)
- `usePTWPermits()` → returns `[]` (no permits listed)
- `usePTWPermit()` → returns `{}` (permit view shows nothing)
- `useCreatePTWPermit()` → mutation does nothing (permit creation silently fails)
- `useUpdatePermitStatus()` → mutation does nothing
- `usePTWProjects()` → returns `[]` (no projects shown)
- `useActivePermitsForMap()` → returns `[]`

Real implementations exist in `src/features/ptw/hooks/` but 15 files import from the stub `@/hooks/ptw`.

**Missing exports from stub:** `useProjectClearances`, `useApproveClearanceCheck`, `useRejectClearanceCheck`, `PTWClearanceCheck`, `useDeletePTWPermit` — these are imported but don't exist in the stub, causing build/runtime failures.

---

## Runtime Error (Active)

```
TypeError: Cannot read properties of undefined (reading 'next')
  at useContractorCompanies → ProjectFormDialog
```

The `useContractorCompanies` re-export in `contractor-management.ts` calls `useRealContractorCompanies()` which internally uses `useBranchFilter()` — this may fail when rendered outside the branch filter context. Needs a guard.

---

## All Issues Found

### 1. Stub hooks file — ALL PTW data fetching broken
- **File:** `src/hooks/ptw/index.ts`
- **Impact:** Every PTW page shows empty data
- **Fix:** Replace all stub functions with re-exports from `src/features/ptw/hooks/`

### 2. Missing worker assignment table
- **DB:** No `ptw_permit_workers` table exists
- **Code:** `createPTWPermit()` stores worker IDs by overwriting `work_scope` with JSON: `{ worker_ids: [...], permit_holder_id: "..." }`
- **Impact:** Work scope data is destroyed; no proper relational worker tracking; can't query "which permits is worker X on?"
- **Fix:** Create `ptw_permit_workers` junction table

### 3. Safety responses not saved
- **Schema:** `ptw_safety_responses` table exists in DB
- **Code:** `createPTWPermit()` never inserts into `ptw_safety_responses` — the `safety_responses` array from the form is ignored
- **Impact:** Safety checklist data is lost after submission

### 4. Operational data not saved
- **Schema:** Type-specific tables exist (`ptw_hot_work_details`, `ptw_excavation_details`, etc.)
- **Code:** `createPTWPermit()` never inserts into any operational detail tables — the `operational_data` object is ignored
- **Impact:** All type-specific operational data is lost

### 5. `validate-permit-request` edge function call may fail silently
- **Code:** The function exists but if it returns a non-2xx response, the error message is generic ("Failed to validate permit request")
- **Impact:** Users see unhelpful error messages

### 6. No `branch_id` set on permit creation
- **DB:** `ptw_permits.branch_id` column exists
- **Code:** `createPTWPermit()` never sets `branch_id` in the insert
- **Impact:** Branch-level filtering/RLS won't work for permits

### 7. No `requested_at` timestamp set
- **Code:** `createPTWPermit()` never sets `requested_at`
- **Impact:** Audit trail incomplete — can't track when permit was first requested

### 8. Permit status update has no authorization check
- **Code:** `updatePermitStatus()` accepts any status from any user — no RPC permission check
- **Impact:** Any authenticated user can endorse/issue/close any permit

### 9. `send-ptw-email` edge function failure is swallowed
- **Code:** Email notification failures are caught and logged but user is never informed
- **Impact:** Users think notifications were sent when they weren't

### 10. `useContractorCompanies` runtime crash in ProjectFormDialog
- **Error:** `Cannot read properties of undefined (reading 'next')`
- **Root cause:** Hook context dependency issue when `useBranchFilter` is called
- **Fix:** Add safety guard in the re-export wrapper

---

## Implementation Plan

### Step 1: Replace stub hooks file (Critical — unblocks everything)
**File:** `src/hooks/ptw/index.ts`

Replace all stub functions with re-exports from the real feature hooks:
```typescript
export { usePTWTypes } from "@/features/ptw/hooks/use-ptw-types";
export { usePTWProjects, usePTWProjectClearances, useCreatePTWProject, useApproveClearanceCheck, useRejectClearanceCheck } from "@/features/ptw/hooks/use-ptw-projects";
export { usePTWPermits, usePTWPermit, useCreatePTWPermit, useUpdatePermitStatus, useActivePermitsForMap, useDeletePTWPermit } from "@/features/ptw/hooks/use-ptw-permits";
// Keep type exports
export type { PTWType } from "@/features/ptw/hooks/use-ptw-types";
export type { PTWProject, PTWClearanceCheck } from "@/features/ptw/hooks/use-ptw-projects";
export type { PTWPermit } from "@/features/ptw/hooks/use-ptw-permits";
```

Also add the missing `useProjectClearances` alias that `ProjectClearanceDialog.tsx` imports.

### Step 2: Create `ptw_permit_workers` table (DB migration)
```sql
CREATE TABLE public.ptw_permit_workers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  permit_id uuid NOT NULL REFERENCES ptw_permits(id) ON DELETE CASCADE,
  worker_id uuid NOT NULL REFERENCES contractor_workers(id),
  is_permit_holder boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE(permit_id, worker_id)
);
ALTER TABLE ptw_permit_workers ENABLE ROW LEVEL SECURITY;
-- RLS policy for tenant isolation
```

### Step 3: Fix `createPTWPermit` service
**File:** `src/features/ptw/services/ptwPermitService.ts`

- Set `branch_id` from site lookup
- Set `requested_at` to `now()`
- After permit insert, insert worker records into `ptw_permit_workers`
- Insert safety responses into `ptw_safety_responses`
- Stop overwriting `work_scope` with JSON worker data

### Step 4: Fix `useContractorCompanies` runtime error
**File:** `src/hooks/contractor-management.ts`

Add error boundary / fallback for when branch filter context is unavailable.

### Step 5: Add `ActiveMapPermit` type export
Keep the `ActiveMapPermit` type that `PermitConsole.tsx` imports — ensure it's exported from the new barrel.

---

## Files Changed

| File | Change |
|------|--------|
| `src/hooks/ptw/index.ts` | Replace stubs with real re-exports |
| `src/hooks/contractor-management.ts` | Fix runtime crash |
| `src/features/ptw/services/ptwPermitService.ts` | Fix create permit (workers, safety, branch_id) |
| DB Migration | Create `ptw_permit_workers` table |

## Technical Notes

- No changes to `src/integrations/supabase/client.ts` or `types.ts`
- The `validate-permit-request` edge function already exists and works
- All existing imports from `@/hooks/ptw` will continue to work since we're replacing stubs with real implementations using the same export names
- The `PTWPermit` type from the real hooks has more specific fields than the stub's `[key: string]: any` — some components may need minor type adjustments

