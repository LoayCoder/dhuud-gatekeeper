

# Fix PTW Creation — Empty Project & Permit Type Dropdowns

## Root Causes Found

### Issue 1: Permit Types — tenant_id filter mismatch (PRIMARY BLOCKER)
- **Service**: `getPTWTypes()` in `ptwPermitService.ts` filters `.eq('tenant_id', tenantId)`
- **Database**: ALL 8 ptw_types rows have `tenant_id = NULL` — they are global/system-level types
- **Result**: The query returns 0 rows because `NULL != tenantId`
- **RLS**: The SELECT policy correctly handles this: `(tenant_id IS NULL) OR (tenant_id = get_auth_tenant_id())`
- **Fix**: Change the service query to use `.or('tenant_id.eq.${tenantId},tenant_id.is.null')` instead of `.eq('tenant_id', tenantId)` to match global types AND tenant-specific types

### Issue 2: Projects — likely working but needs empty-state handling
- **Database**: 20+ ptw_projects exist for tenant `9290e913-...`
- **RLS**: SELECT policy uses `tenant_id = get_auth_tenant_id()` — correct
- **Service**: `getPTWProjects()` filters by tenant_id correctly
- **Hook**: Uses `useBranchFilter()` which may further filter results based on branch context
- **Potential issue**: If user has no branch selected or branch filter is restrictive, results may be empty
- **Fix**: Verify the branch filter isn't over-filtering; add clear empty-state messages

## Implementation Plan

### Step 1: Fix `getPTWTypes` query filter
**File**: `src/features/ptw/services/ptwPermitService.ts`

Change line 7 from:
```typescript
.eq('tenant_id', tenantId)
```
To:
```typescript
.or(`tenant_id.eq.${tenantId},tenant_id.is.null`)
```

This matches both global system types (tenant_id=NULL) and any tenant-specific custom types.

### Step 2: Add empty-state messages in PermitBasicsStep
**File**: `src/features/ptw/components/wizard/PermitBasicsStep.tsx`

- Add empty-state message for permit types: "No permit types configured. Please contact your administrator."
- The project empty-state message already exists (line 110-114) — verify it renders correctly

### Step 3: Add error logging for silent failures
**File**: `src/features/ptw/components/wizard/PermitBasicsStep.tsx`

- Log errors from `usePTWTypes` and `usePTWProjects` hooks to console for debugging
- Show error states in the UI when queries fail

## Files Changed

| File | Change |
|------|--------|
| `src/features/ptw/services/ptwPermitService.ts` | Fix tenant_id filter to include NULL (global) types |
| `src/features/ptw/components/wizard/PermitBasicsStep.tsx` | Add permit type empty-state, error handling |

## No database or migration changes needed
Data exists in both tables. This is purely a frontend query filter bug.

