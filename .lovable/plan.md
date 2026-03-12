

# Fix: Timeline Tracker Shows Wrong Role for Contractor Observations

## Problem

The `UnifiedTimelineTracker` (the compact 5-step timeline visible in the screenshot) hardcodes **"HSSE Expert"** as the role for step 2 ("Initial Review") for all observations. However, contractor observations are reviewed by a **Contractor Consultant**, not an HSSE Expert. The other tracker component (`UnifiedWorkflowTracker`) already handles this correctly.

The screenshot confirms: the observation is assigned to **Ruyuf Al Otaibi** as **Contractor Consultant**, but the timeline shows "HSSE Expert" — this is incorrect.

## Fix

**File:** `src/features/investigation/components/UnifiedTimelineTracker.tsx`

In the `getSteps()` function, for the observation branch, make step 2's `typicalRole` dynamic based on whether the incident has a related contractor (same logic used by `UnifiedWorkflowTracker`):

- Check `incident?.related_contractor_company` to determine if it's a contractor observation
- If contractor → show **"Consultant"**
- If non-contractor → show **"HSSE Expert"**

This is a single-line change in the role string, using a ternary based on the contractor flag already available on the incident object.

## Scope

- **1 file modified**: `src/features/investigation/components/UnifiedTimelineTracker.tsx`
- Change the hardcoded `'HSSE Expert'` to a dynamic value based on `isContractor`

