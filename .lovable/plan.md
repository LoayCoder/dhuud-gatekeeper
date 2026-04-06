

# Fix PTW Dropdowns — Root Cause Found

## The Problem

There is a **module resolution conflict**. Two files compete for the `@/hooks/ptw` import path:

```text
src/hooks/ptw.ts          ← STUB file (returns empty arrays)
src/hooks/ptw/index.ts    ← Real re-exports (wired to database)
```

When TypeScript/Vite resolves `import { usePTWTypes } from "@/hooks/ptw"`, the **file** (`ptw.ts`) wins over the **directory** (`ptw/index.ts`). This means every PTW page gets the stub hooks that return `[]` — making all dropdowns empty despite data existing in the database.

## The Fix

**Delete `src/hooks/ptw.ts`** (the stub file). This lets `src/hooks/ptw/index.ts` take over, which already re-exports the real hooks connected to the database.

### Single change:
- **Delete** `src/hooks/ptw.ts`

No other files need modification. The barrel file `src/hooks/ptw/index.ts` already exports everything the stub did (`usePTWTypes`, `usePTWProjects`, `useProjectClearances`, `useApproveClearanceCheck`, `useRejectClearanceCheck`, `useCreatePTWProject`, etc.) — wired to real Supabase queries.

### Quick verification after fix:
- All 15+ files that import from `@/hooks/ptw` will resolve to `src/hooks/ptw/index.ts`
- Permit Type dropdown will show 8 types (Hot Work, Lifting, Confined Space, etc.)
- Project dropdown will show active projects for the tenant

