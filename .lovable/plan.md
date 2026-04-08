

# Fix: Contractor Portal Hardcodes `photo_path: null` When Opening Worker Detail

## Root Cause

**File: `src/pages/contractor-portal/Workers.tsx`, lines 89-108** — the `openWorkerDetail` function.

When a user clicks a worker name in the contractor portal, this function manually constructs a `ContractorWorker` object instead of passing the actual query data. On **line 99**, it hardcodes:

```typescript
photo_path: null,
```

This overwrites Ahmad's real `photo_path` value (`9290e913.../17a6b893..._1775646493845.jpg`) with `null`. The `WorkerComplianceFlags` component then sees `photo_path === null` and correctly fires the "Worker photo is missing" alert.

The same function also discards many other fields from the actual worker data:
- `tenant_id` is set to `''` (empty string)
- `approved_at` is set to `null`
- `rejection_reason` is set to `null`
- `created_at` is set to `new Date().toISOString()` (wrong date)
- Missing fields: `photo_verified_by`, `photo_verified_at`, `security_approval_status`, `induction_status`, `fitness_to_work`, `fitness_acknowledged`, `medical_check_date`, `fitness_expiry_date`, etc.

This is why the contractor portal shows ~4 false alerts while the admin portal (which passes the real data) shows none.

## Fix

**Replace the manual mapping with a direct cast of the query data.** The `useContractorPortalWorkers` query (lines 98-127 of `use-contractor-portal.ts`) already selects all the fields that `ContractorWorker` needs. The `openWorkerDetail` function should pass the worker data as-is instead of constructing a lossy object.

**File: `src/pages/contractor-portal/Workers.tsx`**

Replace `openWorkerDetail` (lines 89-108) with:

```typescript
const openWorkerDetail = (worker: any) => {
  setSelectedWorker(worker as ContractorWorker);
};
```

This ensures the `WorkerDetailDialog` receives all real data (photo_path, fitness fields, induction_status, etc.), producing identical alerts to the admin view.

The local `PortalWorker` interface (lines 21-45) can also be removed since it's no longer needed — all call sites can use the query data directly.

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/contractor-portal/Workers.tsx` | Replace `openWorkerDetail` to pass real query data; remove `PortalWorker` interface |

## What Gets Fixed

1. Ahmad's photo alert disappears in the contractor portal (matches admin view)
2. All other false alerts (fitness, medical, induction) are eliminated
3. Worker detail dialog shows identical data regardless of entry point

