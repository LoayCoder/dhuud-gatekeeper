

## Fix: "Pending With" Still Shows "Unassigned" in Header

### Root Cause

The previous fix only updated the `currentOwner` variable passed to `IncidentDetailsLayout`. But the **visible** "Pending With" badge in the header comes from a completely different path:

```text
IncidentDetailHeader.tsx (line 239)
  → ResponsibleUserBadge
    → getResponsibleParty()  ← OLD logic, hardcodes name: null for consultant statuses
```

This `getResponsibleParty` in `ResponsibleUserBadge.tsx` is the second duplicate implementation that was never updated.

Additionally, there's a **duplicate "PENDING WITH" label** — one from `IncidentDetailHeader.tsx` (line 237) and one from inside `ResponsibleUserBadge` itself (line 97).

### Changes

**1. `src/features/incidents/components/workflow/ResponsibleUserBadge.tsx`**
- Replace the internal `getResponsibleParty` function with the centralized `getCurrentOwner` from `@/lib/current-owner`
- Map the result to the same UI shape the component expects
- This fixes the "Unassigned" bug for all statuses across the entire app

**2. `src/features/incidents/components/detail/IncidentDetailHeader.tsx`**
- Remove the extra "Pending With" text label (line 236-238) since `ResponsibleUserBadge` already renders its own "Pending With" label internally — fixing the duplicate label issue

