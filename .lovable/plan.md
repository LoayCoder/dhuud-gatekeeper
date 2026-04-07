

# Fix Gate Pass Duplicate Submission

## Problem
Creating a gate pass produces two records (e.g., DP-2026-00002 and DP-2026-00003). Two root causes:

1. **No ref-based submission guard**: `isSubmitting` is React state (async). Between `setIsSubmitting(true)` and the re-render, a second invocation can slip through — especially on slow networks or double-tap on mobile.
2. **Duplicate success toast**: Both `useMutation.onSuccess` (line 157 in hook) and `handleConfirmedSubmit` (line 243 in wizard) fire `toast.success`, confirming the mutation fires but also making it seem like two events happened.

## Changes

### File: `GatePassCreateWizard.tsx`
- Add a `useRef(false)` guard (`submittingRef.current`) checked at the top of `handleConfirmedSubmit`. Set it `true` before calling `mutateAsync`, and only reset on error.
- Remove the duplicate `toast.success` call on line 243 (the hook's `onSuccess` already shows one).
- Disable the AlertDialog's submit button with `disabled={isSubmitting}` to prevent double-click.

### File: `use-material-gate-passes.ts` (useCreateGatePass)
- No changes needed — the hook's `onSuccess` toast is the canonical one.

### Summary
Two small edits in one file: add a ref guard + remove duplicate toast. No DB or backend changes.

