

# Fix: Change Status Dialog Not Opening (Radix DropdownMenu + Dialog Conflict)

## Problem
When clicking a status option in the dropdown submenu, the dropdown closes and its focus/pointer-down-outside event immediately dismisses the `ChangeWorkerStatusDialog` before it becomes visible. This is a known Radix UI conflict between `DropdownMenu` and `Dialog`.

## Fix

### File: `src/pages/contractors/Workers.tsx`
Wrap the `setWorkerToChangeStatus` and `setPendingStatusChange` calls inside `handleStatusChange` in a `setTimeout(..., 0)`. This defers the dialog state update until after the dropdown has fully unmounted, preventing the dropdown's close event from propagating to the newly mounted dialog.

```typescript
const handleStatusChange = (worker: ContractorWorker, status: string) => {
  setTimeout(() => {
    setWorkerToChangeStatus(worker);
    setPendingStatusChange(status);
  }, 0);
};
```

This is a single-line change (wrapping in setTimeout) — no other files need modification.

## Why This Works
The Radix `DropdownMenu` fires pointer-down-outside and focus-outside events when closing. If the `Dialog` mounts synchronously during this same event cycle, the dialog's overlay receives the event and closes immediately. Deferring with `setTimeout(fn, 0)` pushes the dialog mount to the next microtask, after the dropdown cleanup is complete.

