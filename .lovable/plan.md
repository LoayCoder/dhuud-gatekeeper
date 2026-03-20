

# E2E Audit Plan — Observations Module (v8)

## Audit Summary

After thorough code review across all observation lifecycle components, I identified **5 issues** (2 Medium, 3 Low). The overall module is mature and well-integrated, but has specific gaps in status coverage for contractor workflow statuses and the `InvestigationWorkflowStatusCard`.

---

## Findings

### Finding 1 — MEDIUM: `InvestigationWorkflowStatusCard` missing HSSE statuses in observation deptRepCompleted array

**File:** `src/features/investigation/components/InvestigationWorkflowStatusCard.tsx` (lines 103-110)

The `deptRepCompleted` array that determines when the Dept Rep Review step shows as "completed" for observations is missing several HSSE-related statuses. When an observation reaches `pending_hsse_expert_review`, `pending_hsse_rejection_review`, or `pending_hsse_escalation_review`, the Dept Rep step incorrectly shows as "pending" instead of "completed".

**Fix:** Add `pending_hsse_expert_review`, `pending_hsse_rejection_review`, `pending_hsse_escalation_review` to the `deptRepCompleted` array.

---

### Finding 2 — MEDIUM: `InvestigationWorkflowCards` missing cases for contractor workflow statuses

**File:** `src/pages/incidents/InvestigationWorkspace/components/InvestigationWorkflowCards.tsx`

Three contractor observation statuses have no matching `case` in the switch statement, meaning no action card renders:
- `contractor_action_implementation` — contractor is implementing actions
- `pending_contractor_action` — contractor has pending action
- `pending_site_client_action_approval` — site client reviewing actions
- `pending_consultant_verification` — consultant verifying completed actions

**Fix:** Add case entries mapping these to appropriate existing components (e.g., a status info card or the relevant approval/implementation cards).

---

### Finding 3 — LOW: `current-owner.ts` missing statuses

**File:** `src/lib/current-owner.ts`

Missing cases:
- `pending_site_client_action_approval` — should map to "Site Client Rep"
- `contractor_action_implementation` — should map to "Contractor"
- `pending_contractor_action` — should map to "Contractor"
- `pending_consultant_verification` — should map to "Contractor Consultant"
- `pending_action_dispute_review` — should map to "Contractor Consultant"

These cause "PENDING WITH" badges in the Action Center/event list to show nothing for observations in these statuses.

**Fix:** Add the missing case statements with correct owner mappings.

---

### Finding 4 — LOW: `selectedSite` reference error in handlers

**File:** `src/features/incidents/components/QuickObservationCard/hooks/useQuickObservationCardHandlers.ts` (line 215)

The handler references `selectedSite` directly but it's not destructured from `state`. The code uses `selectedSite?.branch_id` in the form data, but `selectedSite` is not in the destructured list at lines 14-20.

**Fix:** Add `selectedSite` to the destructured properties from `state`.

---

### Finding 5 — LOW: Offline submit has redundant `setTimeout` for navigation

**File:** `src/features/incidents/components/QuickObservationCard/hooks/useQuickObservationCardHandlers.ts` (lines 188-190)

In offline mode, there's a `setTimeout(() => state.onCancel?.(), 3000)` that may conflict with the `SubmissionSuccessDialog` countdown. The online path correctly removed this pattern (per v7 fix), but the offline path still has it.

**Fix:** Remove the redundant `setTimeout` in the offline branch, letting the success dialog handle navigation consistently.

---

## Implementation Plan

### Step 1: Fix `InvestigationWorkflowStatusCard` deptRepCompleted array
Add missing HSSE statuses to ensure the Dept Rep step correctly shows as "completed" when the observation has progressed past that stage.

### Step 2: Add missing contractor status cases to `InvestigationWorkflowCards`
Add `case` entries for `contractor_action_implementation`, `pending_contractor_action`, `pending_site_client_action_approval`, and `pending_consultant_verification` with appropriate UI cards.

### Step 3: Fix `current-owner.ts` missing statuses
Add the 5 missing case statements with correct owner/role mappings.

### Step 4: Fix `selectedSite` destructuring in handlers
Add `selectedSite` to the destructured state in `useQuickObservationCardHandlers`.

### Step 5: Remove offline `setTimeout` navigation
Remove the redundant timeout in the offline submission path.

---

## Technical Details

### Status coverage matrix (contractor observation workflow)

```text
Status                              | WorkflowCards | current-owner | workflow-resolver
------------------------------------|---------------|---------------|------------------
expert_screening                    | ✅             | ✅             | ✅
pending_consultant_screening        | ✅             | ✅             | ✅
pending_consultant_review           | ✅             | ✅             | ✅
pending_consultant_actions          | ✅             | ✅             | ✅
pending_site_client_approval        | ✅             | ✅             | ✅
pending_site_client_action_approval | ❌ MISSING     | ❌ MISSING     | ✅
contractor_action_implementation    | ❌ MISSING     | ❌ MISSING     | ✅
pending_contractor_action           | ❌ MISSING     | ❌ MISSING     | ✅
pending_consultant_verification     | ❌ MISSING     | ❌ MISSING     | ✅
pending_action_dispute_review       | ✅             | ❌ MISSING     | ✅
```

### Files to edit
1. `src/features/investigation/components/InvestigationWorkflowStatusCard.tsx`
2. `src/pages/incidents/InvestigationWorkspace/components/InvestigationWorkflowCards.tsx`
3. `src/lib/current-owner.ts`
4. `src/features/incidents/components/QuickObservationCard/hooks/useQuickObservationCardHandlers.ts`

