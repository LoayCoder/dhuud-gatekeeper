

# Collapsible Row Details — Eliminate Horizontal Scroll

## Approach
Convert the desktop table rows into expandable rows. Each row shows only **Title** and **Status** in the collapsed state. Clicking the expand arrow reveals **Reported By**, **Action By**, and **Created/Target Date** in a detail strip below.

## Changes

### 1. `ActionListColumn` — Add `expandable` flag
Add an `expandable?: boolean` property to `ActionListColumn`. Columns marked `expandable` will not render in the main row but instead appear in the collapsible detail area.

### 2. `ActionListTable.tsx` — Expandable row logic
- Add `expandedRows: Set<string|number>` state to track which rows are expanded
- Split columns into `visibleColumns` (no `expandable` flag) and `expandableColumns` (has `expandable: true`)
- Replace the chevron-end (navigate) icon with a toggle chevron (rotates on expand)
- Clicking the chevron toggles expand; clicking the rest of the row triggers `onRowClick` (navigate)
- When expanded, render a `<tr>` below with a `colSpan` detail strip showing the expandable fields in a horizontal grid (label + value pairs)
- Mobile cards: show expandable fields inside a collapsible section with the same toggle

### 3. `IncidentApprovalsList.tsx` — Mark columns expandable
- `reporter_name`, `action_by_name`, `created_at` get `expandable: true`
- Remove `hideOnMobile: true` from those columns (the expandable system handles both)
- Keep `title` and `status` as always-visible

### 4. `IncidentInvestigationsList.tsx` — Same treatment
- `reporter_name`, `action_by_name`, `target_completion_date` get `expandable: true`

## Layout (collapsed row)
```text
| Title (wide)          | Status        | V |
```

## Layout (expanded)
```text
| Title (wide)          | Status        | ^ |
| Reported By: Name  |  Action By: Name  |  Created: Mar 12 |
```

### Files
1. `src/components/action-center/ActionListTable.tsx`
2. `src/components/action-center/modules/IncidentApprovalsList.tsx`
3. `src/components/action-center/modules/IncidentInvestigationsList.tsx`

