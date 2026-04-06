

# Fix Empty "Link to Contractor Project" Dropdown in PTW

## Problem

The PTW `ProjectFormDialog` imports `useContractorCompanies` and `useContractorProjects` from `src/hooks/contractor-management.ts` — a **stub file** that always returns empty arrays. The real data-fetching hooks exist in `src/features/contractors/hooks/`.

## Solution

Replace the stub implementations in `src/hooks/contractor-management.ts` with proper re-exports from the real hooks, adapting the interface to match what the PTW form expects.

## Changes

### Single file: `src/hooks/contractor-management.ts`

- Remove the stub `useContractorCompanies` and `useContractorProjects` functions
- Import and re-export the real hooks from `src/features/contractors/hooks/use-contractor-companies.ts` and `src/features/contractors/hooks/use-contractor-projects.ts`
- The real `useContractorCompanies` accepts a filters object `{ status?: string }` — adapt the re-export to pass the correct shape
- The real `useContractorProjects` accepts a filters object — re-export directly
- Keep the `useCreateContractorWorker` mutation as-is (it's functional)
- Export the `ContractorCompany` and `ContractorProjectRecord` type interfaces so existing PTW imports don't break

### Verify: `src/features/ptw/components/ProjectFormDialog.tsx`

- Line 14 imports `useContractorCompanies, useContractorProjects` from `@/hooks/contractor-management` — no change needed if the re-exports match the current call signatures (both called with no arguments)
- The real `useContractorProjects()` called with no args returns all projects for the tenant — this is the desired behavior
- The real `useContractorCompanies()` called with no args also works (no filters)

## Technical Notes

- No database changes needed
- No new dependencies
- The fix is a wiring issue — connecting existing real hooks to the PTW form

