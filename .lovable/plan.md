

# Fix Workflow Timeline — Show Assigned Names & Actor History

## Problems Identified

### Problem 1: Timeline shows "Awaiting Contractor Consultant" instead of assigned name
The `UnifiedTimelineTracker` shows the active step owner via `getCurrentOwner()`. For `pending_consultant_screening`, `getCurrentOwner()` correctly reads `incident.approval_manager.full_name`. However, the user (Luay) has claimed this task — meaning `approval_manager_id` is set. The `approval_manager` relation IS fetched by `getIncidentById`. So the issue is likely that the `incidentData` object passed to the tracker doesn't include the nested `approval_manager` object after claim/refresh. Need to verify and ensure `handleRefresh` invalidates the incident query so the `approval_manager` relation is re-fetched.

**Root cause confirmed**: After `handleClaim()` in `ConsultantReviewCard`, only `queryClient.invalidateQueries({ queryKey: ['incident', incidentId] })` is called — but `workflowActors` query is separate and uses `approval_manager_id` raw field. The incident data refresh should pick up the `approval_manager` relation. However, `getCurrentOwner` may receive stale data. Will ensure proper invalidation.

### Problem 2: "Submit to Site Client" button is disabled
This is **working as designed** — the button requires `actionsCount >= 1` (at least one corrective action) AND `notes.trim().length > 0` (review notes filled in). The screenshot shows the yellow warning "Create at least one corrective action before submitting" and empty notes. No code fix needed — but the disabled state should have clearer visual feedback.

### Problem 3: Actor names and timestamps not showing on completed steps
The `workflowActors` query in `useInvestigationWorkspaceData.ts` maps:
- `expert_screener` → `expert_screened_by` + `expert_screened_at`

For **contractor observations**, the consultant who screens is stored in `approval_manager_id`, NOT `expert_screened_by`. So for contractor paths, the `expert_screener` actor always resolves to `null`.

Additionally, `workflowActors` doesn't account for contractor-specific fields like `consultant_screened_by` or equivalent timestamps.

## Plan

### Step 1: Fix `workflowActors` query to handle contractor observations
**File**: `src/pages/incidents/InvestigationWorkspace/hooks/useInvestigationWorkspaceData.ts`

After fetching `incidentData`, check the `event_type` and `related_contractor_company_id`. For contractor observations:
- Map `expert_screener` → `approval_manager_id` (the consultant) + `consultant_screened_at` or `expert_screened_at`
- This ensures the "Initial Review" step shows the consultant's name instead of null

Also fetch `consultant_screened_at` (if it exists) in the select query so timestamps are available.

### Step 2: Ensure `handleClaim` invalidates all relevant queries  
**File**: `src/features/investigation/components/contractor-workflow/ConsultantReviewCard.tsx`

After claiming, also invalidate `workflow-actors` so the timeline refreshes with the new owner:
```ts
queryClient.invalidateQueries({ queryKey: ['workflow-actors'] });
```

### Step 3: Add tooltip to disabled "Submit to Site Client" button
**File**: `src/features/investigation/components/contractor-workflow/ConsultantReviewCard.tsx`

Wrap the disabled submit button in a tooltip explaining what's needed: "Add at least one corrective action and fill in review notes to enable submission."

## Files to Edit
1. `src/pages/incidents/InvestigationWorkspace/hooks/useInvestigationWorkspaceData.ts` — fix `workflowActors` actor mapping for contractor observations
2. `src/features/investigation/components/contractor-workflow/ConsultantReviewCard.tsx` — add `workflow-actors` invalidation after claim + tooltip on disabled submit

## Result
- Timeline active step shows assigned consultant's name (e.g., "Luay Ibrahim") instead of "Awaiting Contractor Consultant"
- Completed steps show actor names and timestamps for both internal and contractor paths
- Disabled submit button has clear explanation via tooltip

