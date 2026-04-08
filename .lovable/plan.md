

# Fix: Site Clearance Page Appears Locked

## Root Cause

Two issues make the page appear non-functional:

1. **Mobilization data never loads after auto-creation.** When `ensureMobilization` succeeds, it only invalidates `projects-with-mobilization` but NOT `mobilization-detail`. So the detail hook still has `mob = null`, and all checkbox handlers silently fail because they check `if (mob?.id)` before acting.

2. **Lock icons create a "disabled" appearance.** Every unchecked item shows a Lock icon on the right side, making users think the controls are disabled even though the checkboxes are technically enabled.

## Fix

### 1. Invalidate detail query after mobilization creation
**File: `src/features/mobilization/hooks/use-mobilizations.ts`**
- In `useEnsureMobilization.onSuccess`, add `queryClient.invalidateQueries({ queryKey: ["mobilization-detail"] })` so the detail page refetches and gets the newly created mobilization record.

### 2. Remove misleading Lock icons
**File: `src/pages/mobilization/SiteClearanceDetail.tsx`**
- Replace the Lock icon on unchecked items with a neutral indicator (empty circle or just remove it) so users understand the controls are interactive.
- Optionally: only show Lock when `isApproved` (truly locked state).

### 3. Prevent duplicate mobilization creation
**File: `src/pages/mobilization/SiteClearanceDetail.tsx`**
- Add a guard in the `useEffect` that auto-creates mobilization to also check `ensureMob.isSuccess` to prevent repeated mutations during re-renders.

## Files to Modify

| File | Change |
|------|--------|
| `src/features/mobilization/hooks/use-mobilizations.ts` | Invalidate `mobilization-detail` on ensureMob success |
| `src/pages/mobilization/SiteClearanceDetail.tsx` | Remove Lock icons from unchecked items; add mutation guard |

