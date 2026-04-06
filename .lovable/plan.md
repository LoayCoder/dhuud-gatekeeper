

# Mobile-Responsive Contractor Portal — Full Overhaul

## Summary

Make all 5 contractor portal tabs (Dashboard, Workers, Gate Passes, Projects, Activity Log) and the shared layout fully mobile-responsive at 390px viewport width.

## Problems Identified

1. **Layout header**: Logo + title + nav + logout all crammed in one row; logout text visible on mobile wastes space
2. **Mobile nav bar**: Horizontal scroll of 5 tabs with text + icons — overflows, hard to tap
3. **Workers page**: Page header with title + 2 buttons in a single `flex justify-between` row — buttons overflow. Table with 6 columns is unusable on mobile
4. **Gate Passes page**: Same header overflow issue. Table with 7 columns is completely unreadable on mobile
5. **Activity Log page**: Table with 5 columns, no mobile card layout
6. **Dashboard page**: Stats grid `md:grid-cols-2 lg:grid-cols-4` is fine but header text `text-2xl` could be smaller on mobile
7. **Projects page**: Card grid is already responsive — mostly fine

## Changes

### 1. `ContractorPortalLayout.tsx` — Mobile header & bottom nav

- **Header**: On mobile, hide the title subtitle text, show only logo + portal label. Move logout to icon-only (no text). Keep notification bell
- **Mobile nav**: Convert from horizontal scroll bar below header to a **fixed bottom tab bar** (like native apps). Icon-only on very small screens, icon + short label on slightly larger. This frees up vertical space and is standard mobile UX
- Bottom bar: `fixed bottom-0 inset-x-0 z-50 border-t bg-background` with 5 equal-width items, safe-area padding (`pb-[env(safe-area-inset-bottom)]`)
- Add `pb-20` to `<main>` on mobile to account for bottom bar height

### 2. `Workers.tsx` — Mobile card layout

- **Page header**: Stack vertically on mobile. Title row, then buttons row below (`flex flex-col gap-3` on mobile, `flex-row justify-between` on `sm:+`)
- **Search/filter bar**: Stack search + select + count vertically on mobile (`flex flex-col gap-2`, `sm:flex-row`)
- **Table → Cards**: Hide `<Table>` on mobile (`hidden md:block`). Add a mobile card list (`md:hidden`) showing: name, national ID, status badge, edit button. Each card is a tappable div that opens the detail dialog

### 3. `GatePasses.tsx` — Mobile card layout

- **Page header**: Same vertical stacking pattern as Workers
- **Search/filter**: Stack vertically on mobile
- **Table → Cards**: Hide table on mobile. Mobile cards show: reference number, date, status badge, material description (truncated). Tappable to open detail dialog

### 4. `ActivityLog.tsx` — Mobile timeline/card layout

- **Filter header**: Already responsive (`flex-col sm:flex-row`) — OK
- **`ContractorAuditLogTable.tsx`**: Add mobile card layout (`md:hidden`) alongside hidden table (`hidden md:block`). Each card: date, action badge, entity, actor, details

### 5. `Dashboard.tsx` — Minor tweaks

- Stats grid: Change to `grid-cols-2` on mobile (already works with `md:grid-cols-2 lg:grid-cols-4` but currently single column on mobile — change to `grid-cols-2 lg:grid-cols-4`)
- Welcome text: `text-xl sm:text-2xl`
- Projects/Pending sections: Already `lg:grid-cols-2` — fine

### 6. `ContractorHSSESections.tsx` — Already grid-based, mostly fine

- Ensure inner list items don't overflow on mobile

## Files to Edit

| File | Change |
|------|--------|
| `ContractorPortalLayout.tsx` | Bottom tab bar for mobile, compact header |
| `Workers.tsx` | Stacked header, mobile card list replacing table |
| `GatePasses.tsx` | Stacked header, mobile card list replacing table |
| `ContractorAuditLogTable.tsx` | Mobile card layout |
| `Dashboard.tsx` | 2-col stats grid on mobile, smaller heading |
| `ActivityLog.tsx` | Minor filter layout tweak |

## Technical Notes

- All layouts use CSS logical properties (`ms-`, `me-`, `ps-`, `pe-`, `text-start`, `text-end`)
- Bottom nav uses `pb-[env(safe-area-inset-bottom)]` for notched devices
- Mobile card patterns follow existing `WorkerListTable` dual-layout convention (per memory context)
- No database or backend changes needed

