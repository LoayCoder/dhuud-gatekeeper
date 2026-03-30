

# Fix: Failed Assets Summary Shows Only 1 of 5 Assets

## Problem
The "Failed Assets Summary" section uses a `ScrollArea` with `max-h-[200px]`, but each asset card is tall (~80px+ with padding, badges, parts list). Only ~1 card fits in view, making it look like there's only 1 failed asset. The user has to scroll inside a tiny area to see the rest — poor discoverability.

## Solution
Replace the verbose card-per-asset layout with a **compact table-like list** that shows all 5 assets at a glance without needing to scroll, plus increase the max height.

### New layout per asset (single row, ~32px each):
```text
🔴 fire_safety-00067  Fire Extinguisher  Club House / Ground Floor  3 failed parts
🔴 fire_safety-00066  Fire Extinguisher  Club House / Ground Floor  2 failed parts  
🟡 fire_safety-00065  Fire Extinguisher  Main Building / 1st Floor  1 failed part
...
```

### Changes in `CreateSessionActionDialog.tsx`:
1. **Remove `ScrollArea max-h-[200px]`** — replace with a simple div, increase max-h to `300px` with overflow-y-auto
2. **Compact each asset row**: single-line flex row with inline badge (result), asset code, name, location, and failed parts count — all in one line
3. **Expandable detail**: tap a row to see the full failed parts list (optional accordion), keeping the default view compact
4. **Counter header**: Keep the "5 failed asset(s) detected" subtitle already present

### File to change
- `src/features/incidents/components/inspections/sessions/CreateSessionActionDialog.tsx` (lines 252-289)

