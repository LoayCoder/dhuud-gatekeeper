

# End-to-End Audit — Observations Module

## Audit Summary

After reviewing the full observation lifecycle across UI components, backend queries, workflow resolvers, and status transitions, I identified **7 findings**: 2 Critical, 2 High, 2 Medium, 1 Low.

---

## Finding 1 — CRITICAL: `witness_statements.ai_transcription_text` column does not exist

**Impact**: Every investigation workspace page for incidents with witnesses fails with a 400 error. This is actively breaking in production (visible in network requests).

**File**: `src/hooks/use-witness-statements/use-statement-queries.ts` (line 14)

The query selects `ai_transcription_text` but this column does not exist in the database. The column may have been renamed or never created.

**Fix**: Remove `ai_transcription_text` from the select query and the mapping. Also remove from `use-statement-mutations.ts` and `types.ts`.

---

## Finding 2 — CRITICAL: `workflowActors.manager_approver` conflated with consultant for contractor observations

**Impact**: For contractor observations, `approval_manager_id` serves double duty — it's both the Contractor Consultant (Step 1) AND the value mapped to `manager_approver` (Step 3 "Actions"). This means Step 3 incorrectly shows the consultant's name instead of the actual action approver.

**File**: `src/pages/incidents/InvestigationWorkspace/hooks/useInvestigationWorkspaceData.ts` (line 110)

```typescript
// Line 110: This always maps approval_manager_id to manager_approver
manager_approver: { full_name: profileMap.get(incidentData.approval_manager_id || '') ... }
```

For contractor paths where `approval_manager_id` = consultant, the "Actions" step shows the consultant's name instead of whoever actually approved the actions.

**Fix**: For contractor observations, skip mapping `manager_approver` from `approval_manager_id` since that field holds the consultant. Leave `manager_approver` as null for contractor paths, or map it from a different field if one exists (e.g., `site_client_approved_by`).

---

## Finding 3 — HIGH: `UnifiedTimelineTracker.getStepIndex()` missing observation statuses

**Statuses missing from observation path**:
- `returned_to_reporter` — falls to default `0` which is correct, but should be explicit
- `expert_rejected`, `dept_rep_rejected` — terminal states, not mapped, fall to step 0
- `upgraded_to_incident` — should map to step 4 (terminal/closed equivalent)
- `pending_hsse_manager_closure` — listed in step 4 as `pending_hsse_manager_closure` but only in `closed` array, which is correct
- `expert_screening` (legacy status) — already in step 1, correct

**Fix**: Add `upgraded_to_incident` to step 4 for observations. Add `returned_to_reporter`, `expert_rejected`, `dept_rep_rejected` explicitly to step 0 for observations (currently works by default fallback, but explicit is safer).

---

## Finding 4 — HIGH: `getCurrentOwner()` returns null for `returned_to_reporter` — no action card guidance

**Impact**: When an observation is returned to the reporter, `getCurrentOwner()` returns `null`, so the timeline shows no owner badge. The reporter has no visual cue that action is needed from them.

**File**: `src/lib/current-owner.ts` (line 140)

**Fix**: For `returned_to_reporter`, return `buildOwner(null, "Reporter", true)` so the timeline shows "Awaiting Reporter" on the active step.

---

## Finding 5 — MEDIUM: `InvestigationWorkflowCards` missing `pending_no_investigation_approval` card

**Impact**: If an incident reaches `pending_no_investigation_approval` status, no action card renders — the user sees nothing actionable.

**File**: `src/pages/incidents/InvestigationWorkspace/components/InvestigationWorkflowCards.tsx`

The status `pending_no_investigation_approval` has no `case` in the `renderCard()` switch. It should render a `DeptManagerIncidentApprovalCard` or similar.

**Fix**: Add a case for `pending_no_investigation_approval` that renders `DeptManagerIncidentApprovalCard`.

---

## Finding 6 — MEDIUM: `pending_expert_screening` not handled in `InvestigationWorkflowCards`

**Impact**: When an internal observation hits `pending_expert_screening` (non-contractor path), no action card renders.

**File**: `src/pages/incidents/InvestigationWorkspace/components/InvestigationWorkflowCards.tsx`

The switch handles `submitted` (which shows `HSSEExpertScreeningCard`) but not `pending_expert_screening`. These are functionally the same step.

**Fix**: Add `case 'pending_expert_screening':` before the `submitted` case so both render `HSSEExpertScreeningCard`.

---

## Finding 7 — LOW: `getStatusDisplayLabel()` missing observation-specific statuses

**File**: `src/lib/workflow-status-resolver.ts`

Missing labels for:
- `returned_to_reporter` — { en: 'Returned to Reporter', ar: 'أُعيد للمبلغ' }
- `upgraded_to_incident` — { en: 'Upgraded to Incident', ar: 'تم الترقية إلى حادث' }
- `observation_actions_pending` — { en: 'Actions Pending', ar: 'إجراءات معلقة' }
- `pending_hsse_manager_closure` — { en: 'HSSE Manager Closure', ar: 'إغلاق مدير السلامة' } (already exists but verify)
- `under_investigation` — { en: 'Under Investigation', ar: 'تحت التحقيق' }
- `monitoring_30_day` / `monitoring_60_day` / `monitoring_90_day` — missing labels

**Fix**: Add the missing label entries.

---

## Implementation Plan

### Step 1: Fix `witness_statements` query (Critical)
Remove `ai_transcription_text` from select in `use-statement-queries.ts`, `use-statement-mutations.ts`, and `types.ts`.

### Step 2: Fix `workflowActors.manager_approver` for contractor paths (Critical)
In `useInvestigationWorkspaceData.ts`, conditionally skip mapping `approval_manager_id` to `manager_approver` when on contractor path.

### Step 3: Add missing statuses to `getStepIndex()` (High)
In `UnifiedTimelineTracker.tsx`, add `upgraded_to_incident`, `returned_to_reporter`, `expert_rejected`, `dept_rep_rejected` to observation path.

### Step 4: Fix `getCurrentOwner()` for `returned_to_reporter` (High)
Return Reporter owner info instead of null.

### Step 5: Add missing workflow card cases (Medium)
Add `pending_expert_screening` and `pending_no_investigation_approval` to `InvestigationWorkflowCards.tsx`.

### Step 6: Add missing display labels (Low)
Add bilingual labels for ~8 statuses in `workflow-status-resolver.ts`.

## Files to Edit

1. `src/hooks/use-witness-statements/use-statement-queries.ts` — remove nonexistent column
2. `src/hooks/use-witness-statements/use-statement-mutations.ts` — remove nonexistent column
3. `src/hooks/use-witness-statements/types.ts` — remove field
4. `src/pages/incidents/InvestigationWorkspace/hooks/useInvestigationWorkspaceData.ts` — fix manager_approver mapping
5. `src/features/investigation/components/UnifiedTimelineTracker.tsx` — add missing statuses
6. `src/lib/current-owner.ts` — fix returned_to_reporter
7. `src/pages/incidents/InvestigationWorkspace/components/InvestigationWorkflowCards.tsx` — add missing cases
8. `src/lib/workflow-status-resolver.ts` — add missing labels

