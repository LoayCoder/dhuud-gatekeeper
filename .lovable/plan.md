

# Fix: Remove Auto-Hide on Part Click — Add Explicit Confirm Button

## Problem
When a user clicks Pass/Fail on a part, `handleConditionChange` fires with `allComplete=true` once all parts are answered, which immediately calls `onComplete()` — collapsing/hiding the asset. This prevents users from reviewing results or selecting Partial before confirming.

## Solution
Remove all automatic `onComplete()` calls from condition-change and partial handlers. Add an explicit **"Confirm Inspection"** button at the bottom of `QuickInspectionCard` that the user must click to finalize.

## Changes

### 1. QuickInspectionCard — Remove auto-complete, add Confirm button
**File:** `src/features/incidents/components/inspections/sessions/QuickInspectionCard.tsx`

- **Remove** the `if (allComplete) { onComplete?.(); }` block inside `handleConditionChange` (lines 55-57)
- **Remove** `onComplete?.()` from `handlePartial` (line 101)
- **Keep** `onComplete?.()` only in `handleNotAccessible` (that's the one shortcut)
- **Add** a `confirmed` state to prevent double-submit
- **Add** a `handleConfirm` function that:
  - Guards: if `!partsAllComplete || !finalCondition` → show toast warning
  - Saves the final `quick_result` to DB
  - Sets `confirmed = true`
  - Calls `onComplete?.()`
- **Render** a prominent Confirm button below the parts checklist:
  - Label shows the derived condition (e.g., "Confirm — Good Condition" or "Confirm — Not Good")
  - Green when good, red when not_good, amber when partial
  - Disabled when: not all parts complete, or already confirmed, or loading
  - Full-width, large touch target (`h-12`)
- After confirmation, show a green "Inspected ✓" badge and disable all interaction

### 2. No changes to AssetPartInspectionCard
The child component already correctly reports `(condition, allComplete, hasCriticalFail)` on every change. No modification needed.

### 3. No changes to AreaSessionWorkspace
The `onComplete` callback in the workspace already handles auto-advancing to the next asset. It just won't fire until the user explicitly confirms.

## Files Modified
| File | Change |
|------|--------|
| `QuickInspectionCard.tsx` | Remove auto-complete calls, add Confirm button with validation |

