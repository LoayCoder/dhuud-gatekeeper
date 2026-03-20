

# Show Actor Names & Timestamps on Every Workflow Step

## Problem

The `UnifiedTimelineTracker` (the horizontal stepper bar) only shows the current owner on the active step. Completed steps show no information about **who** performed the action or **when**. Users need to see the full audit trail inline — reporter name + date, approver name + date, etc. — directly on each step.

## Plan

### Step 1: Pass `workflowActors` data to `UnifiedTimelineTracker`

**File:** `src/pages/incidents/InvestigationWorkspace.tsx`

The `workflowActors` data is already fetched in `useInvestigationWorkspaceData`. Pass it as a prop to `UnifiedTimelineTracker`:

```tsx
<UnifiedTimelineTracker incident={incidentData} workflowActors={workflowActors} />
```

### Step 2: Enhance `UnifiedTimelineTracker` to display actor info on all steps

**File:** `src/features/investigation/components/UnifiedTimelineTracker.tsx`

- Add `workflowActors` to the component props (reuse the `WorkflowActors` interface)
- Map each step index to its corresponding actor key:
  - Step 0 (Submitted/Reported) → `submitted_by`
  - Step 1 (Initial Review/Triage) → `expert_screener`
  - Step 2 (Approval/Investigation) → `dept_rep` (observation) or `investigator` (incident)
  - Step 3 (Actions/Corrective Actions) → `manager_approver`
  - Step 4 (Closed) → `closure_approver`
- For **completed** steps: show actor name + formatted date/time below the step label
- For **current** step: keep the existing owner badge (from `getCurrentOwner`) + show role
- For **upcoming** steps: show nothing extra

**Desktop display per completed step:**
```
   ✓
Submitted
Ahmad M.
Mar 15, 14:30
```

**Mobile display per completed step:**
```
✓  Submitted · Ahmad M. · Mar 15, 14:30
```

### Step 3: Handle missing actors gracefully

If `workflowActors` is null/undefined (data still loading), show the step labels without actor info — no crashes, no "undefined" text. If a specific actor is null (e.g., no dept rep assigned yet), skip the name display for that step.

## Files to Edit

1. `src/features/investigation/components/UnifiedTimelineTracker.tsx` — add props, map actors to steps, render names + timestamps
2. `src/pages/incidents/InvestigationWorkspace.tsx` — pass `workflowActors` prop

## Result

Every workflow step shows **who** acted and **when**, creating a complete inline audit trail. The current step shows who it's pending with. No duplicate cards needed.

