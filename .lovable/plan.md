

# Fix Mobile Overflow in Contractor Portal HSSE Cards

## Problem

The list items inside Recent Observations, Recent Incidents, Corrective Actions, and Violations cards use a single horizontal `flex justify-between` row. On mobile, the badges (severity, status, overdue) and chevron on the right side overflow horizontally, forcing the user to scroll left/right.

## Solution

Restructure each list item from a single horizontal row to a **stacked layout on mobile**: title and date on top, badges wrapped below. This eliminates horizontal overflow entirely.

## Changes

### Single file: `ContractorHSSESections.tsx`

For all 4 detail card sections (Observations, Incidents, Actions, Violations), change each list item from:

```text
[Title + Date] ←→ [Severity Badge] [Status Badge] [Chevron]  (one row, overflows)
```

To:

```text
[Title]                                    [Chevron]
[Date]
[Severity Badge] [Status Badge]                      (wrapped, fits mobile)
```

Specifically:
- Change outer `flex items-center justify-between` to a vertical stack layout
- Move the title row to have just title text + chevron (flex between)
- Put date below title
- Wrap badges in a `flex flex-wrap gap-1.5 mt-1.5` row below the date
- Remove `ms-2` from badge containers since they're no longer side-by-side with title
- Keep all click handlers, accessibility, and RTL support intact

This is a CSS-only restructure — no logic, data, or functionality changes.

