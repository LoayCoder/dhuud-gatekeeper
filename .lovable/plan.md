

# Update ID Card Design — Logo + Colored Header Bar

## Overview

Redesign the ID card front layouts (both Portrait and Landscape) to match the new design: a light header with the tenant logo on one side and a colored bar (no text) on the other, with card-type-specific accent colors.

## Design Changes

```text
Current Header:
┌──────────────────────────────────────────┐
│ [Logo] [Tenant Name] [CARD TYPE BADGE]   │  ← Fully colored background
└──────────────────────────────────────────┘

New Header:
┌──────────────────────────────────────────┐
│ [Logo]  [═══════ Color Bar ═══════]      │  ← Light bg, color bar only
└──────────────────────────────────────────┘
```

## Card Type Color Map

| Type | Color | Hex |
|------|-------|-----|
| Contractor (`contractor_rep`) | Orange | `#FFA21A` |
| Employee (`employee`) | Blue | `#2B64E3` |
| Visitor (`visitor`) | Gray | `#3F434C` |
| VIP Visitor (`visitor_vip`) | Gray | `#3F434C` |
| Worker (`worker`) | Red | `#C43718` |

## Files Changed

| File | Change |
|------|--------|
| `src/features/admin/components/id-cards/IDCardTemplate/layouts/PortraitFrontLayout.tsx` | Redesign header: light background, logo left, color bar fills remaining space. Remove tenant name text and card type badge from header. Keep photo, name (Arabic primary), fields, and QR sections with the same structure but using card-type color for borders/accents. |
| `src/features/admin/components/id-cards/IDCardTemplate/layouts/LandscapeFrontLayout.tsx` | Same header redesign for landscape orientation. |
| `src/features/admin/components/id-cards/IDCardTemplate/utils.ts` | Add `CARD_TYPE_COLORS` map for the 5 card types. |
| `src/features/admin/components/id-cards/IDCardTemplate/types.ts` | No change needed — `LayoutProps` already has `cardType` for color lookup. |
| `src/types/id-card.types.ts` | Update `DEFAULT_CARD_SETTINGS` accent colors to match new color map. |

## Header Layout Detail

- Background: `#f5f5f5` (light gray)
- Bottom border: `2px solid #e0e0e0`
- Logo: 32px height, auto width
- Gap: 12px between logo and bar
- Color Bar: `flex: 1`, height 32px, border-radius 4px, filled with card-type color
- No text in header (tenant name and badge removed from header area)

## Body Layout (unchanged structure)

- Photo with colored border (card-type color)
- Arabic name prominent, English name secondary
- Field rows: Company, Role, Valid Until (label–value pairs)
- QR code with colored border
- "Scan to verify" / "امسح للتحقق" footer text

