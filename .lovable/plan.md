

## Problem

Current color tokens show almost zero contrast between page background and cards:

```text
Light Mode:
  --background: 0 0% 100%    (pure white)
  --card:       0 0% 100%    (pure white)  ← IDENTICAL

Dark Mode:
  --background: 220 13% 13%  (L=13%)
  --card:       220 15% 15%  (L=15%)      ← only 2% difference
```

Cards (action cards + HSSE contact) blend into the page. The border at `border-border/50` is too faint to compensate.

## Solution: Adjust background vs card surface contrast

The minimal, professional fix is to **lower the page background slightly** so cards "float" on top, rather than making cards darker. This preserves the clean card look.

### Color layers proposed

```text
LIGHT MODE (white layers):
  Page background:  210 20% 97%   (#F5F7FA — cool off-white, subtle blue tint)
  Card surface:     0 0% 100%     (#FFFFFF — stays pure white)
  → Cards pop naturally against the slightly tinted background

DARK MODE (dark layers):  
  Page background:  220 13% 10%   (darker — was 13%)
  Card surface:     220 15% 17%   (lighter — was 15%)
  → 7% lightness gap instead of current 2%
```

### What changes

**File: `src/index.css`** — Only 4 CSS variable values change:

```css
/* Light mode */
--background: 210 20% 97%;      /* was: 0 0% 100% */
/* --card stays 0 0% 100% */

/* Dark mode */  
--background: 220 13% 10%;      /* was: 220 13% 13% */
--card: 220 15% 17%;            /* was: 220 15% 15% */
```

**File: `src/components/home/HSSEContactCompact.tsx`** — No change needed; it already uses `bg-card` and `border-border/50` which will automatically benefit from the new contrast.

**File: `src/components/home/ActionCard.tsx`** — No change needed; same reason.

### Why this works
- Light mode: Cards are white on a very light blue-gray background — clean, professional, cards clearly visible
- Dark mode: 7% lightness gap makes cards clearly distinct without looking heavy
- Only CSS variables change — zero component code changes needed
- All existing cards, dialogs, and popovers benefit automatically

