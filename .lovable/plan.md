

# Fix: Real inspection hooks shadowed by stubs

## Problem

The barrel file `src/features/incidents/index.ts` exports stubs first (line 202: `export * from './hooks/use-inspection-stubs'`), then only re-exports **some** hooks from the real `use-inspection-sessions` module (lines 237-252). Three critical hooks are missing from the override list:

- **`useRecordAssetInspection`** — saves overall asset condition (good/not_good/partial)
- **`useCreateFinding`** — creates findings on failure
- **`useCreateSession`** / **`useStartSession`** — session lifecycle

Because these are missing, the **stub versions** (which are no-ops) are what `QuickInspectionCard` actually imports. This means:
- Clicking Good/Not Good/Partial does nothing — the mutation is a no-op stub
- Auto-derive calls `recordInspection.mutateAsync()` but it's the stub, so no DB update
- The Partial button code exists in the component but its action is silently swallowed

## Fix

**File: `src/features/incidents/index.ts`** (lines 237-252)

Add the missing hooks to the explicit re-export list:

```typescript
export {
  useInspectionSessions,
  useInspectionSession,
  useSessionAssets,
  useUninspectedAssets,
  useSessionAssetByAssetId,
  useSessionProgress,
  useSessionFindings,
  useCreateSession,          // ← ADD
  useStartSession,           // ← ADD
  useRecordAssetInspection,  // ← ADD (fixes quick_result saves)
  useCreateFinding,          // ← ADD (fixes finding creation)
  useCompleteSession,
  useCloseSession,
  useDeleteSession,
  useUpdateFinding,
  useAddAssetToSession,
  useRefreshSessionAssets,
  useSessionPartsProgress,
} from './hooks/use-inspection-sessions';
```

This single change will:
1. Make the Partial button functional (it's already rendered in the UI code)
2. Make auto-derive actually save the overall condition to the database
3. Make Good/Not Good/Not Accessible buttons actually persist results
4. Make finding creation work on failure submissions

No other file changes needed — the component code and auto-derive logic are already correct.

