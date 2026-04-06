

# Fix: Change Status Dialog Immediately Closing (Radix Focus Conflict)

## Root Cause

The `setTimeout(0)` fix in `Workers.tsx` is already applied but insufficient. The real issue is in `WorkerActionsDropdown.tsx` (line 118-121): the status `DropdownMenuItem` uses `onClick` to call `onStatusChange`. When Radix closes the dropdown, its focus-restoration and pointer-outside events fire synchronously, dismissing the dialog before it renders.

## Fix

**File:** `src/features/contractors/components/WorkerActionsDropdown.tsx`

On the status change `DropdownMenuItem` (line 118), replace `onClick` with `onSelect` and call `event.preventDefault()` to prevent the dropdown from auto-closing. Then call `onStatusChange` which triggers the dialog. This keeps the dropdown open momentarily while the dialog mounts, avoiding the focus conflict.

```tsx
// Before (line 118-121):
<DropdownMenuItem
  key={option.value}
  onClick={() => onStatusChange(option.value)}
  disabled={isCurrentStatus}

// After:
<DropdownMenuItem
  key={option.value}
  onSelect={(e) => {
    e.preventDefault();
    onStatusChange(option.value);
  }}
  disabled={isCurrentStatus}
```

This is a single change in one file. The existing `setTimeout` in `Workers.tsx` can remain as a secondary safety net.

## Files

| File | Change |
|------|--------|
| `WorkerActionsDropdown.tsx` | Replace `onClick` with `onSelect` + `preventDefault` on status items |

