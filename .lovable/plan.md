

## Problem

The recent color changes made the homepage cards look heavy and cluttered:
- Thick colored left borders (`border-s-4`) are too prominent
- Colored background tints (`dark:bg-destructive/5`, etc.) make cards look inconsistent
- The `--card` and `--border` CSS variable changes altered the entire app's appearance

## Plan: Revert and Apply Minimal Fix

### 1. Revert ActionCard styles (src/components/home/ActionCard.tsx)

Remove the colored left borders and background tints. Keep cards clean with just:
- Clean `bg-card` background (no color tint)
- No `border-s-4` — use only the standard `border border-border` 
- Keep the existing icon color scheme (icon background + icon color) as they were originally fine
- Restore original icon opacity levels

Updated styles — simple and clean:
```typescript
danger: {
  bg: 'bg-card',
  iconBg: 'bg-destructive/10 dark:bg-destructive/20',
  iconColor: 'text-destructive',
  hoverBg: 'group-hover:bg-destructive/15 dark:group-hover:bg-destructive/25',
}
// Same pattern for all schemes
```

### 2. Revert CSS variables (src/index.css)

Restore the original dark mode values:
- `--card: 220 15% 15%` (revert from 18%)
- `--border: 217 25% 24%` (revert from 28%)

### 3. Add only a subtle card elevation difference

Instead of colored borders, use a slightly more visible border in dark mode and a soft shadow — enough to distinguish cards without being heavy:
- `border-border/60` instead of `border-border/50` in dark mode
- Keep `shadow-sm` for light separation

### Files to modify
- `src/components/home/ActionCard.tsx` — remove colored borders and tints, restore clean card style
- `src/index.css` — revert `--card` and `--border` to original values

