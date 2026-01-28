
# Fix Contractor Consultant Action Creation Access

## Problem Identified

The Contractor Consultant **has** the UI button to create actions (in `ConsultantReviewCard`), but clicking it fails because the **Actions tab content is blocked**.

### Root Cause
In `src/pages/incidents/InvestigationWorkspace.tsx`, the `investigationAllowed` array (lines 295-312) controls which statuses can access investigation tabs (Evidence, Witnesses, RCA, Actions).

**Current state:** The array includes `pending_consultant_screening`, `pending_consultant_review`, `pending_consultant_actions` but is **missing** `expert_screening`.

**Impact:** When contractor observations are routed to `expert_screening` status (the current routing behavior), the Consultant sees the review card but cannot access the Actions tab to create corrective actions.

## Solution

Add `'expert_screening'` to the `investigationAllowed` array so the Contractor Consultant can access the Actions tab when reviewing contractor observations.

## Technical Change

**File:** `src/pages/incidents/InvestigationWorkspace.tsx`

**Lines:** 295-312

**Change:**
```typescript
const investigationAllowed = status && [
  'investigation_in_progress', 
  'pending_closure', 
  'pending_final_closure', 
  'investigation_closed', 
  'closed',
  'monitoring_30_day',
  'monitoring_60_day',
  'monitoring_90_day',
  'pending_hsse_incident_validation',
  // Contractor consultant workflow statuses
  'expert_screening',                    // ADD THIS LINE
  'pending_consultant_screening',
  'pending_consultant_review',
  'pending_consultant_actions',
  'pending_site_client_approval',
  'pending_contractor_implementation',
  'pending_consultant_verification',
].includes(status);
```

## Expected Behavior After Fix

| Step | Before Fix | After Fix |
|------|------------|-----------|
| 1. Consultant opens contractor observation at `expert_screening` | ✅ ConsultantReviewCard shows | ✅ ConsultantReviewCard shows |
| 2. Consultant clicks "Create Action" button | ❌ Navigates to Actions tab but sees "Complete workflow first" message | ✅ Navigates to Actions tab and sees ActionsPanel |
| 3. Consultant creates corrective action | ❌ Not possible | ✅ Can create, edit, delete actions |
| 4. Consultant submits to Site Client | ❌ Cannot proceed (no actions) | ✅ Can proceed with actions attached |

## Impact Assessment

- **Scope:** Single line addition
- **Risk:** Low - only adds a status to an existing allowed list
- **Testing:** Create/view contractor observation at `expert_screening` status, verify Actions tab is accessible
