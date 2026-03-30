

# Update Confirm Button Logic — Two Options on Failure

## Problem
Currently: (1) condition auto-saves on every part change (line 50-53), and (2) only one confirm button is shown. User wants NO auto-save and TWO confirm buttons when failures exist.

## Required Behavior
- **All parts pass** → Single button: "Confirm — Good Condition"
- **Some parts fail (no critical)** → Two buttons: "Confirm — Fail Condition" AND "Confirm — Partial Condition"
- **Critical failure** → Single button: "Confirm — Fail Condition" (no partial option)
- **No auto-save** — remove the `recordInspection.mutateAsync` call from `handleConditionChange`

## Changes

### File: `QuickInspectionCard.tsx`

1. **Remove auto-save from `handleConditionChange`** (lines 49-57) — only update local state, no DB call
2. **Remove the standalone Partial button** from `conditionButtons` grid — partial is now offered as a confirm option instead
3. **Replace single confirm button** with conditional rendering:
   - If `derivedCondition === 'good'` → one green "Confirm — Good Condition" button
   - If `derivedCondition === 'not_good' && !hasCriticalFail` → two buttons side-by-side:
     - Red: "Confirm — Fail Condition" (saves `not_good`)
     - Amber: "Confirm — Partial Condition" (saves `partial`)
   - If `derivedCondition === 'not_good' && hasCriticalFail` → one red "Confirm — Fail Condition" button
4. **Remove `handlePartial`** function — no longer needed as separate action
5. **Update `handleConfirm`** to accept a `result` parameter instead of computing it

### No other files changed

