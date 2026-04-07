

# Enhance Public Gate Pass Item Form

## Overview

Align the public gate pass item form (`PublicGatePassItemForm.tsx`) with the internal form's improved item handling. The public form already has structured vehicle plate and driver phone validation — the gap is in the items section.

## Current State vs Target

| Feature | Public Form (Current) | Internal Form (Target) |
|---------|----------------------|----------------------|
| Label | "Item Name / Material" | "Item Description" |
| Qty validation | `type="number"`, no required error | `type="text" inputMode="decimal"`, numeric-only sanitization, required with error |
| Unit validation | No required error shown | Required with error highlighting |
| Unit options | 10 options (PCS, BOX, KG...) | 11 options including Bags, Tons, Pallets |
| Qty/Unit errors | Not shown | Per-field destructive border + error text |

## Changes

### 1. Update `PublicGatePassItemForm.tsx`

- Rename label "Item Name / Material" → "Item Description"
- Change Qty input from `type="number"` to `type="text" inputMode="decimal"` with numeric sanitization (digits + decimal only, no multiple dots)
- Add `hasQtyError` and `hasUnitError` flags based on `showValidation`
- Add destructive border + error text for Qty and Unit when invalid
- Expand unit dropdown to match internal form options (add Bags, Tons, Pallets)
- Update item completeness check in card border color

### 2. Update `publicRequestSchema.ts`

- Make `quantity` required with min(1) instead of optional string
- Make `unit` required with min(1) instead of optional string
- This ensures step 3 validation catches incomplete items

### Files Modified

| File | Change |
|------|--------|
| `src/pages/public-gate-pass/components/PublicGatePassItemForm.tsx` | Rename label, fix qty input, add validation errors, expand units |
| `src/pages/public-gate-pass/publicRequestSchema.ts` | Make quantity and unit required in schema |

