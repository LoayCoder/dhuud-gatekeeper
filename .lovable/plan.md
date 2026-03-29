

# Fix: Auto-Derive Asset Condition from Part Inspection Results

## What's wrong now

The auto-derive logic already exists in the code (`QuickInspectionCard.tsx` and `AssetPartInspectionCard.tsx`), but it's broken because **every button click** (Good, Not Good, Partial, Not Accessible) sets `manualOverride = true`, which permanently disables auto-derivation after the first click. The auto-derive callback `onConditionChange` never fires after that.

## What will change

### File: `QuickInspectionCard.tsx`

**1. Fix manualOverride triggers**
- `handleGood` and the auto-derive callback → do NOT set `manualOverride` (these match what auto-derive would produce)
- `handlePartial` and `handleNotAccessible` → set `manualOverride = true` (these are deliberate overrides)
- `handleFailureSubmit` (Not Good with failure dialog) → do NOT set `manualOverride` (matches auto-derive output)

**2. Allow auto-derive to clear manual override**
- When `handleConditionChange` fires from parts, if `manualOverride` is false, save the derived result as today
- Add a "reset override" behavior: clicking Good or Not Good buttons explicitly clears `manualOverride = false`, so subsequent part changes resume auto-derivation

**3. Ensure Partial stays manual-only**
- `onConditionChange` callback only produces `'good'` or `'not_good'` — never `'partial'`
- Partial is only ever set by the user clicking the amber Partial button

### File: `AssetPartInspectionCard.tsx`

No changes needed — the `deriveCondition` function already correctly derives `'good'` (all pass) or `'not_good'` (any fail) and fires `onConditionChange`.

## Resulting behavior

| Scenario | Result |
|----------|--------|
| All 6 parts pass | Auto → **Good** |
| Any part fails | Auto → **Not Good** |
| User clicks Partial | Manual override → **Partial** (auto-derive stops) |
| User clicks Good/Not Good after Partial | Clears override, auto-derive resumes |
| User clicks Not Accessible | Manual override → **Not Accessible** |

## Technical summary

Only `QuickInspectionCard.tsx` is modified. The change is ~10 lines: removing `setManualOverride(true)` from `handleGood` and `handleFailureSubmit`, and adding `setManualOverride(false)` to those handlers so they re-enable auto-derivation.

