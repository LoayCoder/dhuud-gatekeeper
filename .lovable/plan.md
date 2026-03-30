

# Enforce Inspection-Driven Condition Logic (Remove Shortcut Behavior)

## Summary
Remove the ability for users to click Good/Not Good/Partial buttons to immediately save and complete an asset. Instead, condition is derived from completing the parts checklist. Only "Not Accessible" remains as a direct action.

## Changes

### 1. QuickInspectionCard — Convert buttons to indicators + controlled override
**File:** `src/features/incidents/components/inspections/sessions/QuickInspectionCard.tsx`

**Remove shortcut behavior from Good, Not Good, Partial buttons:**
- **Good** button: becomes read-only indicator (no click handler, visually muted unless auto-derived)
- **Not Good** button: becomes read-only indicator (no click handler). Remove the `FailureReasonDialog` trigger from this button
- **Partial** button: clickable ONLY when at least one fail exists AND no critical fail. Sets `manualOverride = true` and saves `partial` — but does NOT call `onComplete()`
- **Not Accessible** button: keeps current behavior (saves immediately, disables checklist, calls `onComplete()`)

**Add completion validation:**
- Accept a new prop `partsComplete: boolean` from `AssetPartInspectionCard` (or derive internally)
- `onComplete()` is only called when all parts are answered AND condition is set
- Show a validation toast if user tries to leave/collapse without completing: "Please complete all inspection parts before finalizing this asset"

**Update `handleConditionChange` callback:**
- Remove the `manualOverride` guard for auto-derivation — Good and Not Good are now ALWAYS auto-derived
- When auto-deriving `not_good`, check if any critical part failed → if yes, disable the Partial override button
- Save `quick_result` to DB on each derivation change (keep current behavior)
- Call `onComplete()` only when all parts answered

### 2. AssetPartInspectionCard — Report completion status upward
**File:** `src/features/incidents/components/inspections/AssetPartInspectionCard.tsx`

**Extend `onConditionChange` callback signature:**
- Change to: `onConditionChange?: (condition: 'good' | 'not_good', allComplete: boolean, hasCriticalFail: boolean) => void`
- Fire on every part change (not just when all complete), passing current derived state + completion flag + critical fail flag

**Update `deriveCondition`:**
- Always fire callback (remove the early return for incomplete parts)
- Pass `allComplete = answeredParts.length === parts.length`
- Pass `hasCriticalFail = parts.some(p => p.is_critical && results[p.id]?.result === 'fail')`

### 3. QuickInspectionCard — Partial button logic
**File:** `src/features/incidents/components/inspections/sessions/QuickInspectionCard.tsx`

**Partial override rules:**
- Disabled when: no fails exist, or any critical fail exists, or not all parts complete
- When clicked: saves `quick_result = 'partial'`, shows "Manual" label
- Clicking Good/Not Good indicator resets to auto mode (re-derive from parts)

### 4. AreaSessionWorkspace — Prevent accordion collapse on incomplete
**File:** `src/pages/inspections/AreaSessionWorkspace.tsx`

- `onComplete` currently does nothing (`() => {}`). Update to auto-advance to next uninspected asset only when parts are fully complete
- The accordion item for an asset should show a warning indicator if expanded and incomplete

## Button Behavior Summary

| Button | Clickable? | Action |
|--------|-----------|--------|
| Good | No (indicator only) | Auto-derived when all parts pass |
| Not Good | No (indicator only) | Auto-derived when any part fails |
| Partial | Conditional | Manual override, requires fails + no critical fail + all complete |
| Not Accessible | Yes | Saves immediately, disables checklist, marks complete |

## Files Modified
| File | Change |
|------|--------|
| `QuickInspectionCard.tsx` | Remove save-on-click for Good/Not Good/Partial, add completion validation, update condition logic |
| `AssetPartInspectionCard.tsx` | Extend callback to report completion + critical fail status |
| `AreaSessionWorkspace.tsx` | Auto-advance only on complete, add incomplete indicator |

## No Schema Changes
All fields already exist. The enforcement is purely UI/logic level.

