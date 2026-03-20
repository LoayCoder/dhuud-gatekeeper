

# Deep Audit — Unified Timeline Tracker & Workflow Status Accuracy (v10)

## Audit Summary

After reviewing all key files (`UnifiedTimelineTracker.tsx`, `InvestigationWorkflowCards.tsx`, `current-owner.ts`, `workflow-status-resolver.ts`, `InvestigationWorkflowStatusCard.tsx`, `incident-status-colors.ts`), I found **3 issues** — 1 High, 1 Medium, 1 Low.

---

## Finding 1 — HIGH: `UnifiedTimelineTracker.getStepIndex()` missing 10+ incident statuses

**File:** `src/features/investigation/components/UnifiedTimelineTracker.tsx` (lines 42-48)

The incident path of `getStepIndex()` is missing many statuses, causing the timeline to fallback to step 0 ("Reported") even when the incident has progressed further. This is the root cause of confusing timeline display.

**Missing from step 1 (Triage):**
- `pending_department_manager_approval` — Dept Manager approval stage
- `pending_no_investigation_approval` — No-investigation gate
- `pending_hsse_rejection_review` — HSSE expert rejection review
- `pending_hsse_expert_review` — HSSE expert review
- `expert_rejected` — rejected by expert (terminal but triage-stage)
- `manager_rejected` — rejected by manager
- `pending_clinic_review` — clinic review
- `pending_legal_review` — legal review
- `pending_dept_rep_approval` — dept rep approval (for incidents that go through this)

**Missing from step 3 (Corrective Actions):**
- `pending_department_manager_violation_approval` — violation approval
- `pending_contract_controller_approval` — contract controller
- `dispute_resolution` — dispute stage
- `pending_contractor_dispute_review` — contractor dispute

**Missing from step 4 (Closed):**
- `pending_hsse_incident_validation` — final HSSE validation
- `monitoring_30_day`, `monitoring_60_day`, `monitoring_90_day` — monitoring periods
- `hsse_enforced` — enforcement closure

**Fix:** Add all missing statuses to the correct step indices.

---

## Finding 2 — MEDIUM: `workflow-status-resolver.ts` DEPT_REP_STATUSES missing incident status

**File:** `src/lib/workflow-status-resolver.ts` (lines 79-83)

`DEPT_REP_STATUSES` does not include `pending_dept_rep_incident_review`. The `canRoleActOnStatus()` function will return `false` for Dept Reps viewing incidents at this status, which could prevent the admin from seeing it's pending with a Dept Rep.

**Fix:** Add `'pending_dept_rep_incident_review'` to `DEPT_REP_STATUSES`.

---

## Finding 3 — LOW: `getStatusDisplayLabel()` missing incident-specific statuses

**File:** `src/lib/workflow-status-resolver.ts` (lines 230-266)

Missing display labels for:
- `pending_dept_rep_incident_review` — { en: 'Dept Rep Incident Review', ar: 'مراجعة حوادث ممثل القسم' }
- `pending_department_manager_approval` — { en: 'Dept Manager Approval', ar: 'موافقة مدير القسم' }
- `pending_clinic_review` — { en: 'Clinic Review', ar: 'مراجعة العيادة' }
- `investigation_pending` — { en: 'Awaiting Assignment', ar: 'في انتظار التعيين' }
- `investigation_in_progress` — { en: 'Investigation In Progress', ar: 'التحقيق جارٍ' }
- `pending_legal_review` — { en: 'Legal Review', ar: 'مراجعة قانونية' }

**Fix:** Add the missing label entries.

---

## Implementation Plan

### Step 1: Fix `UnifiedTimelineTracker.getStepIndex()` for incidents
Add all missing incident statuses to the correct step index so the timeline accurately reflects where the incident is in its lifecycle. This is the most impactful fix — it's what users actually see.

### Step 2: Add `pending_dept_rep_incident_review` to `DEPT_REP_STATUSES`
Ensures the centralized resolver correctly identifies Dept Reps as the owner for incident review status.

### Step 3: Add missing display labels to `getStatusDisplayLabel()`
Ensures all incident statuses have proper bilingual labels.

---

## Files to Edit

1. `src/features/investigation/components/UnifiedTimelineTracker.tsx` — add ~15 missing incident statuses to `getStepIndex()`
2. `src/lib/workflow-status-resolver.ts` — add to DEPT_REP_STATUSES + add display labels

