

# Deeper Fix: SelectBubbleInput Crash in Session Creation Dialogs

## Root Cause

This is a **known Radix UI Select bug** (issues #3133, #3135, #3597 on GitHub). The crash occurs when:
1. A controlled `Select` has a `value` that doesn't match any rendered `SelectItem` (e.g., during async data loading or after filtering changes the available options)
2. The internal Radix collection becomes empty momentarily during React re-renders, causing a null ref access in `SelectBubbleInput`

The current defensive guards (`field.value && filteredSites.some(...)`) are insufficient because the crash happens at the Radix internals level during render transitions, not from the value prop alone.

## Fix Strategy: Replace Radix Select with native HTML selects for cascading fields

The template and session-type selects (which have stable option lists) can stay as Radix Selects. But the **cascading filter selects** (Branch → Site, Category → Type) whose options change dynamically are the crash source. These will be replaced with styled native `<select>` elements wrapped in a reusable component.

### Files to modify

**1. Create `src/components/ui/native-select.tsx`**
A styled native `<select>` component matching the design system (same height, border, font as SelectTrigger). This avoids all Radix internals while maintaining visual consistency.

```text
Props: value, onChange, placeholder, disabled, options: {value, label}[], dir
```

**2. Update `CreateSessionDialog.tsx`**
- Replace the 4 cascading Radix Selects (Branch, Site, Category, Type) with `NativeSelect`
- Keep the Session Type and Template selects as Radix (stable option lists)
- Remove the defensive `.some()` guards (no longer needed)

**3. Update `CreateAreaSessionDialog.tsx`**
- Same pattern: replace cascading location selects (Branch, Site, Building, Floor/Zone) with `NativeSelect`

**4. Update `CreateAuditSessionDialog.tsx`**
- Same pattern for any cascading selects

### Why native select?
- Zero crash risk — no virtual DOM collection management
- Works perfectly with dynamic/filtered option lists
- RTL-compatible via `dir` prop
- Simpler code, fewer edge cases
- Visually identical with proper Tailwind styling

### No database changes needed

