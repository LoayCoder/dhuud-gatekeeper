

# Auto-Derive Overall Asset Condition from Part Inspection Results

## What This Does

When an inspector checks individual parts of a fire extinguisher (Agent Rating, Discharge Mechanism, etc.), the system will **automatically set the overall asset condition** based on part results instead of requiring a separate manual click on "Good Condition" / "Not Good" buttons.

---

## Logic

| Part Results | Auto-Set Overall Condition |
|---|---|
| All parts pass (or pass/NA) | **Good** |
| Any part fails | **Not Good** |
| User manually overrides | **Partial** (new option) |

- **Partial** is never auto-selected — it's a manual override button the inspector can press when they judge a minor failure doesn't warrant "Not Good"
- If the user changes a part result later, the auto-logic re-evaluates and updates the overall condition (unless the user has manually set Partial)

---

## Changes

### 1. Database: Add `partial` to quick_result values
No schema migration needed — `quick_result` is a `text` column, not an enum. We just need to handle the new value in code.

### 2. `AssetPartInspectionCard.tsx` — Add auto-derive + callback
- Add an `onConditionChange` callback prop
- After each part result save, compute the derived condition:
  - If no parts answered yet → no change
  - All answered parts are pass/na → `good`
  - Any answered part is fail → `not_good`
- Call `onConditionChange(derivedResult)` after each part toggle

### 3. `QuickInspectionCard.tsx` — Wire auto-update + add Partial button
- Pass an `onConditionChange` callback to `AssetPartInspectionCard`
- When called, automatically update `quick_result` via `useRecordAssetInspection`
- Add a **Partial** override button (amber/yellow) to the 3-button row, making it a 4th option
- When "Partial" is manually selected, set `quick_result = 'partial'` and stop auto-deriving until parts change again
- Track a `manualOverride` state: when user clicks Partial, suppress auto-derive; when parts change, reset override and re-derive
- Show the already-inspected badge for `partial` with an amber/warning style
- Allow re-clicking Good/Not Good/Partial even after initial selection (the buttons remain interactive, not read-only, so the user can correct)

### 4. `useRecordAssetInspection` — Accept `partial` value
Already accepts any string for `quick_result` — no changes needed.

### 5. Session progress queries — Count `partial` as inspected
In `useCompleteSession` and progress calculations, treat `partial` same as `good`/`not_good` (it's a completed inspection).

### 6. UI for already-inspected state
Update the result badge display in `QuickInspectionCard` to handle `partial`:
- Amber/warning badge with an appropriate icon
- Translation key: `inspectionSessions.result_partial`

---

## Technical Details

### Auto-derive logic (in AssetPartInspectionCard)
```typescript
// After each part result change:
const answeredParts = parts.filter(p => localResults[p.id]?.result);
if (answeredParts.length === parts.length) {
  const hasFail = answeredParts.some(p => localResults[p.id].result === 'fail');
  onConditionChange?.(hasFail ? 'not_good' : 'good');
}
```

### QuickInspectionCard flow
```text
User expands asset card
  └─ Fills in part checklist (pass/fail/na per part)
       └─ All parts answered?
            ├─ All pass/na → auto-set quick_result = 'good'
            └─ Any fail → auto-set quick_result = 'not_good'
                  └─ User disagrees? → clicks "Partial" → quick_result = 'partial'
```

### Button layout change
Current: `[Good] [Not Good] [Not Accessible]`
New: `[Good] [Not Good] [Partial] [Not Accessible]`

The buttons remain available even after auto-derivation so the user can manually override at any time.

---

## Files Modified

| File | Change |
|---|---|
| `AssetPartInspectionCard.tsx` | Add `onConditionChange` prop, compute derived condition after each part save |
| `QuickInspectionCard.tsx` | Wire auto-update callback, add Partial button, handle manual override state |
| `use-session-lifecycle-mutations.ts` | Count `partial` as inspected in completion logic |
| `use-session-parts-progress.ts` | No change needed (already counts all results) |
| Translation files | Add `result_partial` key |

