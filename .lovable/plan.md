

## Problem

The homepage action cards lack visual contrast in both light and dark modes. The card background (`bg-card`) is nearly identical to the page background, making cards blend together. The icon color washes (10-20% opacity) are too subtle, especially in dark mode.

From the screenshot: the dark mode cards appear as flat dark rectangles with barely visible borders, and the colored icon backgrounds don't pop enough.

## Plan

### 1. Enhance ActionCard visual distinction (src/components/home/ActionCard.tsx)

- Add a **colored left/start border** (3-4px) to each card matching its color scheme — this is a proven HSSE pattern already used in inspections
- Increase icon background opacity from 10-20% to 20-30% (light) and 25-40% (dark) for stronger color presence
- Add a subtle **inner glow/gradient** on hover to reinforce the color identity
- Use `border-border` with higher visibility in dark mode

### 2. Improve dark mode card surface contrast (src/index.css)

- Bump `--card` in dark mode from `220 15% 15%` to `220 15% 18%` — gives ~5% more lightness separation from the background (`220 13% 13%`)
- Slightly increase `--border` in dark mode from `217 25% 24%` to `217 25% 28%` for more visible card edges

### 3. Update color scheme styles (src/components/home/ActionCard.tsx)

For each color scheme, add:
- `border-s-4 border-s-{color}` — colored start border for instant visual identity
- Stronger dark-mode icon backgrounds (e.g., `dark:bg-destructive/30` instead of `/20`)
- A subtle card background tint in dark mode (e.g., `dark:bg-destructive/5`) so cards aren't all the same gray

### Technical Details

**ActionCard.tsx** — Updated `colorSchemeStyles` record:
```typescript
danger: {
  bg: 'bg-card border-s-4 border-s-destructive/70 dark:border-s-destructive dark:bg-destructive/5',
  iconBg: 'bg-destructive/15 dark:bg-destructive/25',
  iconColor: 'text-destructive',
  hoverBg: '...',
}
// Similar for warning, info, success, primary, default
```

**index.css** — Dark mode token adjustments:
```css
.dark {
  --card: 220 15% 18%;        /* was 15% */
  --border: 217 25% 28%;      /* was 24% */
}
```

### Files to modify
- `src/components/home/ActionCard.tsx` — color scheme styles with colored borders + stronger tints
- `src/index.css` — dark mode card/border contrast tokens

