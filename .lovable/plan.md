

# Implement: Remove Auto-Hide + Add Explicit Confirm Button

The plan was already approved. Here is exactly what will be changed in `QuickInspectionCard.tsx`:

## Changes to `QuickInspectionCard.tsx`

### 1. Add new imports and state
- Import `ShieldCheck` icon
- Add `confirmed` state (`useState(false)`)
- Compute `finalConditionLabel` and `confirmButtonColor` based on derived/manual condition

### 2. Remove auto-complete calls
- **Line 55-57**: Remove `if (allComplete) { onComplete?.(); }` from `handleConditionChange`
- **Line 101**: Remove `onComplete?.()` from `handlePartial`
- Keep `onComplete?.()` only in `handleNotAccessible`

### 3. Add `handleConfirm` function
```typescript
const handleConfirm = async () => {
  if (!partsAllComplete) { toast.warning(...); return; }
  const finalResult = manualOverride ? 'partial' : (derivedCondition || 'good');
  await recordInspection.mutateAsync({ session_asset_id, quick_result: finalResult });
  setConfirmed(true);
  toast.success('Inspection confirmed successfully.');
  onComplete?.();
};
```

### 4. UI changes
- Wrap Card with `confirmed` state: green border + "Inspected ✓" overlay badge when confirmed
- Disable all buttons and checklist after confirmation (`confirmed && "pointer-events-none opacity-60"`)
- Add a full-width **Confirm Inspection** button below the parts checklist:
  - Green when good, red when not_good, amber when partial
  - Disabled when parts incomplete or already confirmed
  - Label: "Confirm — Good Condition" / "Confirm — Not Good" / "Confirm — Partial"
  - Hidden when `isNotAccessible` or `confirmed`

### No other files changed
`AssetPartInspectionCard` and `AreaSessionWorkspace` remain unchanged.

