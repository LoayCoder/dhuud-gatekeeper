

# Fix ID Card Settings: Save Not Working + QR Overflow

## Problem 1: Save Not Functional

**Root cause:** The `IDCardSettingsForm` uses `useForm({ defaultValues })` which only applies on initial mount. When the user switches between card type tabs, `liveSettings` changes but the form's internal state keeps the old tab's values. The form never calls `form.reset()` when the `settings` prop changes.

**What happens:**
1. User opens Visitor tab — form initializes with Visitor defaults
2. User changes accent color, clicks Save — submits old/mixed values
3. User switches to Worker tab — form still holds Visitor values internally
4. Save on Worker tab writes Visitor data to the Worker record

**Fix in `IDCardSettingsForm.tsx`:** Add a `useEffect` that calls `form.reset(newValues)` when `settings` or `cardType` props change:

```typescript
useEffect(() => {
  form.reset({
    template_preset: (settings.template_preset as TemplatePreset) || 'standard',
    card_orientation: (settings.card_orientation as CardOrientation) || 'portrait',
    // ... all fields matching defaultValues
  });
}, [cardType, JSON.stringify(settings)]);
```

Extract the "build form values from settings" logic into a helper function to avoid duplication between `defaultValues` and `reset()`.

## Problem 2: Visitor/VIP Cards QR Overflow

**Root cause:** In portrait mode (width=204px, height=324px at scale 1), the card stacks: Header + Photo (38% of width = ~77px tall) + Name + Fields + QR (30% of width = ~61px). With 5 fields on Visitor/VIP cards, content overflows the fixed card height.

**Fix in `PortraitFrontLayout.tsx`:**
- Reduce QR size from 30% to 22% of card width in portrait mode
- Add `overflow: hidden` safety
- Make the fields section use smaller font/tighter spacing when many fields are present
- Reduce photo size slightly (35% instead of 38%) to free vertical space
- Make QR section more compact (tighter padding)

## Files to Modify

| File | Change |
|------|--------|
| `src/features/admin/components/id-cards/settings/IDCardSettingsForm.tsx` | Add `useEffect` with `form.reset()` when `settings`/`cardType` changes; extract helper for form values |
| `src/features/admin/components/id-cards/IDCardTemplate/layouts/PortraitFrontLayout.tsx` | Reduce QR/photo sizes, tighten spacing to prevent overflow on content-heavy cards |

