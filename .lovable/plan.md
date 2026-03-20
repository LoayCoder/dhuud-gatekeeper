

# Unify Observation Workflow Status Display

## Problem

The InvestigationWorkspace page shows **three separate, inconsistent workflow displays** for observations:

1. **Status badge** in the header ("pending consultant screening")
2. **CurrentOwnerCard** below header ("Awaiting Assignment" — misleading for consultant screening)
3. **UnifiedTimelineTracker** horizontal stepper (may show wrong step for contractor statuses)

This creates user confusion — the status says "pending consultant screening" but the owner card says "Awaiting Assignment" and the workflow tracker shows "Department Rep Review: Pending."

## Root Causes

- **`CurrentOwnerCard`**: For `pending_consultant_screening`, `approval_manager` is null, so it shows "Awaiting Assignment" even though the Contractor Consultant role is correctly identified — the visual presentation is misleading
- **`InvestigationWorkflowStatusCard`**: Missing contractor observation statuses in `deptRepCompleted` array — `pending_consultant_screening` and all contractor-specific statuses are absent, causing Dept Rep step to show as "pending" instead of "completed"
- **Duplication**: Three separate components all try to communicate "where is this in the workflow" — this fragments the information

## Plan

### Step 1: Merge Current Owner info into UnifiedTimelineTracker

Enhance `UnifiedTimelineTracker` to show the current owner role and name **inline on the active step**, replacing the need for a separate `CurrentOwnerCard`. The tracker already shows roles for each step — we'll add the owner's name and an "Awaiting" indicator for unassigned states directly on the active step.

**File**: `src/features/investigation/components/UnifiedTimelineTracker.tsx`
- Import and call `getCurrentOwner()` from `@/lib/current-owner`
- Display the owner name/role badge on the active (current) step
- For unassigned states, show a subtle "Awaiting [Role]" label instead of a separate card

### Step 2: Remove CurrentOwnerCard from InvestigationWorkspace

Remove the `CurrentOwnerCard` rendering from `InvestigationWorkspace.tsx` since its information is now embedded in the timeline tracker.

**File**: `src/pages/incidents/InvestigationWorkspace.tsx`
- Remove the `CurrentOwnerCard` import and its JSX block (lines 162-164)

### Step 3: Fix InvestigationWorkflowStatusCard contractor status coverage

Even though this card is only used in the debug page, fix it for consistency. Add all contractor observation statuses to the `deptRepCompleted` array so the Dept Rep step correctly shows as "completed" when the workflow has moved to consultant screening.

**File**: `src/features/investigation/components/InvestigationWorkflowStatusCard.tsx`
- Add `pending_consultant_screening`, `pending_consultant_review`, `pending_consultant_actions`, `pending_site_client_approval`, `pending_site_client_action_approval`, `contractor_action_implementation`, `pending_contractor_action`, `pending_contractor_implementation`, `pending_consultant_verification`, `pending_action_dispute_review` to the `deptRepCompleted` array (lines 103-113)

### Step 4: Verify UnifiedTimelineTracker handles contractor statuses correctly

Ensure the horizontal stepper correctly marks "Initial Review" as current for `pending_consultant_screening` and shows the correct role (Contractor Consultant vs HSSE Expert).

**File**: `src/features/investigation/components/UnifiedTimelineTracker.tsx`
- Verify contractor status arrays include all relevant statuses
- Ensure the active step role label resolves correctly

## Files to Edit

1. `src/features/investigation/components/UnifiedTimelineTracker.tsx` — merge owner display into active step
2. `src/pages/incidents/InvestigationWorkspace.tsx` — remove `CurrentOwnerCard`
3. `src/features/investigation/components/InvestigationWorkflowStatusCard.tsx` — fix contractor status arrays

## Result

One unified, single-source-of-truth workflow display that shows:
- Which step is active
- Who owns it (with name if assigned, or "Awaiting [Role]" if not)
- Clear visual progression without duplication or contradiction

