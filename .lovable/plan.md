

# Fix: "Pending With" Badge Shows Wrong Role for Contractor Observations

## Problem

OBS-2026-0111 is a contractor observation (status: `expert_screening`, contractor: P54) but the "Pending With" badge shows **"Unassigned (HSSE Expert)"** instead of **"Unassigned (Contractor Consultant)"**.

The centralized `getCurrentOwner()` in `src/lib/current-owner.ts` hardcodes "HSSE Expert" for `expert_screening` status without checking if the incident is a contractor observation.

## Fix

**File:** `src/lib/current-owner.ts` (lines 55-60)

For statuses `expert_screening` and `pending_expert_screening`, check if `incident.related_contractor_company` exists. If so, return "Contractor Consultant" as the role instead of "HSSE Expert".

```typescript
case "expert_screening":
case "pending_expert_screening":
    if (incident.related_contractor_company_id || incident.related_contractor_company) {
        return buildOwner(null, "Contractor Consultant", true);
    }
    return buildOwner(null, "HSSE Expert", true);

case "investigation_pending":
case "pending_investigator_assignment":
case "pending_hsse_expert_review":
    return buildOwner(null, "HSSE Expert", true);
```

This separates the contractor-specific statuses from the general HSSE Expert statuses. The `ResponsibleUserBadge` and all other UI components that consume `getCurrentOwner` will automatically show the correct role.

**Scope:** 1 file, ~5 lines changed.

