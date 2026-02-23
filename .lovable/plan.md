

# Test Report: C4, C5, C10 Flows -- Gaps Found

## Summary

After tracing each flow through the codebase (hooks, components, migrations, workflow routing), here are the findings and required fixes.

---

## C4: No Investigation Approval Gate

**What it should do:** When HSSE Expert marks "No Investigation Required," the incident goes to Dept Manager for approval before closing.

**What works:**
- Migration added `pending_no_investigation_approval` status to enum
- `use-hsse-workflow.ts` line 186: Expert screening correctly routes to `pending_no_investigation_approval`
- `IncidentStatusBadge.tsx`: Badge config exists for this status
- Grandfathering migration ran for existing records

**Gaps found (3 issues):**

| # | Issue | File(s) | Fix |
|---|-------|---------|-----|
| 1 | No UI card exists for Dept Manager to approve/reject "no investigation" decisions | New: `NoInvestigationApprovalCard.tsx` | Create a card similar to `DeptManagerIncidentApprovalCard` with Approve (closes incident as `no_investigation_required`) and Reject (returns to `pending_expert_screening`) actions |
| 2 | `pending_no_investigation_approval` is missing from `TriageStage.tsx` switch statement | `src/features/investigation/components/stages/TriageStage.tsx` | Add case routing to the new `NoInvestigationApprovalCard` |
| 3 | `pending_no_investigation_approval` is missing from `useInvestigationWorkflow.ts` stage mapping | `src/features/investigation/hooks/useInvestigationWorkflow.ts` line 44-54 | Add to Triage stage cases |

---

## C5: Expert Resubmission Cap (Max 3)

**What it should do:** After expert rejection, reporter can resubmit up to 3 times. On the 4th attempt, the system blocks resubmission.

**What works:**
- `use-hsse-workflow.ts` lines 344-365: `resubmit_to_expert` action increments `expert_resubmission_count` and throws error at >= 3
- `expert_resubmission_count` column exists in DB

**Gaps found (2 issues):**

| # | Issue | File(s) | Fix |
|---|-------|---------|-----|
| 1 | **Bug**: Resubmit routes to `expert_screening` (line 357) instead of `pending_expert_screening` | `src/hooks/use-hsse-workflow.ts` | Change `newStatus = 'expert_screening'` to `newStatus = 'pending_expert_screening'` |
| 2 | `RejectionConfirmationCard.tsx` does not show resubmission count or disable the resubmit button when max is reached | `src/components/investigation/RejectionConfirmationCard.tsx` | Fetch `expert_resubmission_count`, show count badge, disable "Resubmit to Expert" button at count >= 3 with explanation message |

---

## C10: OSHA Auto-Flag

**What it should do:** When an incident includes fatality/hospitalization/amputation/eye-loss keywords, auto-flag as OSHA reportable and notify.

**What works:**
- `use-incidents.ts` lines 230-252: Keyword detection runs on incident creation, sets `osha_reportable = true`, dispatches notification
- `IncidentStatusBadge.tsx`: Badge exists for `osha_reportable` status
- `incident-status-colors.ts`: Color mapping exists
- DB column `osha_reportable` exists with index

**Gaps found (2 issues):**

| # | Issue | File(s) | Fix |
|---|-------|---------|-----|
| 1 | No OSHA indicator shown on incident detail or investigation workspace pages | `src/pages/incidents/IncidentDetail.tsx` or `InvestigationWorkspace.tsx` | Add a prominent red "OSHA Reportable" alert banner when `incident.osha_reportable === true` |
| 2 | OSHA check only runs at creation time -- if injury details are edited later to include OSHA keywords, the flag is never set | `src/hooks/use-incidents.ts` (update mutation) | Add the same keyword check in the incident update/edit mutation |

---

## Implementation Plan

### New Files
1. `src/components/investigation/NoInvestigationApprovalCard.tsx` -- Dept Manager card for C4 gate

### Modified Files
1. `src/hooks/use-hsse-workflow.ts` -- Fix `expert_screening` to `pending_expert_screening` (C5 bug)
2. `src/features/investigation/components/stages/TriageStage.tsx` -- Add `pending_no_investigation_approval` case
3. `src/features/investigation/hooks/useInvestigationWorkflow.ts` -- Add `pending_no_investigation_approval` to Triage stage mapping
4. `src/components/investigation/RejectionConfirmationCard.tsx` -- Show resubmission count + disable at max (C5 UI)
5. `src/pages/incidents/IncidentDetail.tsx` -- Add OSHA banner (C10 UI)
6. `src/hooks/use-incidents.ts` -- Add OSHA keyword check to update mutation (C10 edit-time)
7. `src/hooks/use-dept-manager-incident-approval.ts` -- Add `approveNoInvestigation` / `rejectNoInvestigation` mutation (C4 backend)

### Priority Order
1. C5 status bug fix (1 line, highest impact -- broken routing)
2. C4 approval gate (new card + routing -- missing workflow step)
3. C10 OSHA UI indicator (visibility gap)
4. C10 edit-time OSHA check (edge case)
5. C5 resubmission count UI (polish)

