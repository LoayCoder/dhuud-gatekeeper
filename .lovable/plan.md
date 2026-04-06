

# Fix: Permit Submission "Validation failed" — Response Field Name Mismatch

## Problem

The `validate-permit-request` edge function returns `{ isValid: true, errors: [], warnings: [] }` (camelCase), but `createPTWPermit` in `ptwPermitService.ts` checks `validationResult?.is_valid` (snake_case).

Since `is_valid` is always `undefined`, the condition `!validationResult?.is_valid` is always `true`, so every submission throws "Validation failed" even when validation passes.

## Fix

**File: `src/features/ptw/services/ptwPermitService.ts`** (line 124-126)

Change:
```typescript
if (!validationResult?.is_valid) {
    const errorMessages = validationResult?.errors?.map(...)
```
to:
```typescript
if (!validationResult?.isValid) {
    const errorMessages = validationResult?.errors?.map(...)
```

One character change — `is_valid` → `isValid` — to match the edge function's actual response shape.

## Files Changed

| File | Change |
|------|--------|
| `src/features/ptw/services/ptwPermitService.ts` | Fix `is_valid` → `isValid` on line 124 |

