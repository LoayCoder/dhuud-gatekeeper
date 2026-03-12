

## Problem: Duplicate `getCurrentOwner` Logic with Inconsistent Results

There are **two separate implementations** of `getCurrentOwner`:

1. **`src/lib/current-owner.ts`** — the proper centralized version. For `pending_consultant_screening`, it correctly reads `approval_manager.full_name` and returns **"Ruyuf Al Otaibi (Contractor Consultant)"**.

2. **`src/pages/incidents/IncidentDetail.tsx` (lines 112-162)** — a local inline version that **always returns `name: null`** for consultant statuses. This is why the detail page shows **"Unassigned (Contractor Consultant)"** even though Ruyuf is assigned.

### OBS-2026-0001 Approval Workflow (Golf Saudi)

```text
Reporter: Mohammed Al Khammees
Status:   pending_consultant_screening
Role:     Contractor Consultant
Assigned: Ruyuf Al Otaibi (approval_manager)

Pending Approvals list → reads approval_manager → shows "Ruyuf Al Otaibi" ✓
Detail page            → hardcodes name: null   → shows "Unassigned"      ✗
```

Luay sees it in Pending Approvals because `can_approve_investigation` RPC returns `true` — Luay also has the `contractor_consultant` role.

### Fix

Replace the inline `getCurrentOwner` in `IncidentDetail.tsx` with the centralized one from `src/lib/current-owner.ts`. This will:
- Show **"Ruyuf Al Otaibi (Contractor Consultant)"** on the detail page
- Eliminate the duplicate logic
- Ensure consistency across the app

**File to modify:** `src/pages/incidents/IncidentDetail.tsx`
- Remove the local `getCurrentOwner` function (lines 112-162)
- Import and use the centralized `getCurrentOwner` from `@/lib/current-owner`
- Map the result to the format expected by the detail page UI

