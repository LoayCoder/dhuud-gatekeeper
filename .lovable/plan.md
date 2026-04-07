

# Improve Items & Photos Tab UI

## Problem
The current Items & Photos tab shows items in a flat, minimal style — just a name and a small badge. It lacks visual hierarchy, item numbering, and clear separation of item details (description, serial number, quantity/unit).

## Changes

### File: `src/features/contractors/components/GatePassDetailDialog/tabs/ItemsPhotosTab.tsx`

**Redesign each item card to be more structured and informative:**

1. **Add item index number** — Show `#1`, `#2`, etc. as a numbered indicator on each item for clarity
2. **Structured layout with labeled fields** — Instead of inline text, show labeled rows:
   - **Item Name** — prominent, bold
   - **Description** — if present, shown below name with label
   - **Serial Number** — shown with `SN:` label in a subtle mono style
   - **Quantity & Unit** — displayed as a clearly labeled field (e.g., "Qty: 22 tons") with a colored badge
3. **Better visual card styling** — Use a slightly elevated card with a left accent border and better spacing
4. **Item summary header** — Show total item count in the section header (e.g., "Items (3)")
5. **Photo count per item** — Show photo count label (e.g., "2 Photos") before the photo grid
6. **Empty state polish** — Cleaner empty state with icon

### No other files changed
This is a UI-only improvement to the existing component. No data fetching or backend changes needed.

