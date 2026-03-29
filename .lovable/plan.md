

# Enhance Asset Inspection UI & Logic

## Summary
Improve the QuickInspectionCard and AssetPartInspectionCard components for a professional inspection-grade experience: better button layout, stacked part controls, inline comments, disabled state for "Not Accessible", and real-time condition sync.

## Changes

### 1. QuickInspectionCard — Condition Buttons Redesign
**File:** `QuickInspectionCard.tsx`

- Keep existing 4 buttons (Good, Not Good, Partial, Not Accessible) but improve styling:
  - Selected state: solid fill with white text + ring indicator
  - Unselected state: subtle outline with colored icon/text
  - Consistent icon sizing (h-7 w-7) and min touch target (44px)
- When **Not Accessible** is selected, pass `readOnly={true}` to `AssetPartInspectionCard` and show a muted overlay message ("Asset not accessible — checklist disabled")
- Move result badge above the buttons (currently below asset info) for immediate visibility
- Add smooth CSS transition on selection (`transition-all duration-200`)

### 2. AssetPartInspectionCard — Stacked Part Layout
**File:** `AssetPartInspectionCard.tsx`

Current layout places Pass/Fail/NA/Comment buttons **beside** the part name. Change to **stacked**:

```text
┌─────────────────────────────────┐
│ Agent Rating        [Critical]  │
│                                 │
│  [ ✔ Pass ] [ ✖ Fail ] [ – NA ] [ 💬 ] │
│                                 │
│  (Comment textarea — if open)   │
└─────────────────────────────────┘
```

- Part name + badges on first row (full width)
- Action buttons on second row below, wrapped in `flex gap-2`
- Buttons: larger touch targets (`h-10 min-w-[60px]`) with labels always visible (remove `hidden sm:inline`)
- Comment button: distinct from result buttons, positioned at end
- Auto-expand notes field when **Fail** is selected on any part (per UX memory)

### 3. Condition Sync — Auto-derive with Override
**Files:** `QuickInspectionCard.tsx`, `AssetPartInspectionCard.tsx`

Current logic already implements this correctly:
- All pass → auto `good`
- Any fail → auto `not_good`
- Manual `partial`/`not_accessible` sets `manualOverride = true`, blocking auto-derive

Enhancement:
- When user clicks **Good** or **Not Good** manually after a manual override, reset `manualOverride = false` (already done)
- Add visual indicator on the condition badge when auto-derived vs manually overridden (small "auto" or "manual" label)

### 4. Disabled Checklist for Not Accessible
**File:** `QuickInspectionCard.tsx`

When `quick_result === 'not_accessible'`:
- Pass `readOnly={true}` to `AssetPartInspectionCard`
- Wrap parts card in `opacity-50 pointer-events-none` with a centered overlay message

### 5. Visual Hierarchy — Color-coded Part Cards
**File:** `AssetPartInspectionCard.tsx` (PartRow)

Already partially implemented. Enhance:
- **Pass**: Green left border (`border-s-4 border-s-green-500`) + subtle green bg
- **Fail**: Red left border + subtle red bg
- **Fail + Critical**: Red border all around + destructive bg (already done)
- **NA**: Gray left border + muted bg
- **Unanswered**: Default border, no color
- Add entrance animation on result change (`animate-in fade-in`)

### 6. Critical Fail → Auto Not Good
Already implemented in `deriveCondition()`. No change needed — if any part fails (critical or not), condition becomes `not_good`. The Critical badge is visual emphasis only.

## Files Modified
| File | Change |
|------|--------|
| `QuickInspectionCard.tsx` | Improved button styling, selected states, disabled checklist on Not Accessible, transition animations |
| `AssetPartInspectionCard.tsx` | Stacked layout for part rows, larger touch targets, auto-expand notes on Fail, enhanced color borders |

## No Schema Changes
All data fields already exist: `session_id`, `asset_id`, `part_id`, `result`, `notes`, `quick_result` (with `partial` value). No migration needed.

