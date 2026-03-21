

# E2E Audit — Incident Investigation Process — Pass 12

## Overall Status: CONDITIONAL PASS (1 HIGH, 1 MEDIUM finding)

---

## Phase 1: System Understanding Summary

The incident investigation lifecycle is implemented across these core components:

```text
Incident Report → AI Analysis → Dept Rep Review → HSSE Expert Screening
→ Manager Approval → Investigator Assignment (Single L1-2 / Team L3-5)
→ Evidence Collection → Witness Statements → RCA (5 Whys + Root Causes)
→ RCA Lock → Completeness Check → Server-Side Readiness Gate
→ Submit Investigation → HSSE Validation → Final Closure
→ Monitoring (30/60/90 day) → Closed
```

Key pages: `/incidents/report` (wizard), `/incidents/{id}` (detail), `/incidents/investigate` (workspace), `/incidents/my-actions`, `/action-center`.

Investigation Workspace tabs: Overview, Evidence, Witnesses, RCA, Actions, Audit Log. Workflow cards render dynamically based on 40+ statuses via `InvestigationWorkflowCards.tsx`.

---

## Phase 2: Key Findings

### Finding 1: HIGH — `useInvestigationCompleteness` uses STUB evidence hook (always returns empty)

**File:** `src/features/investigation/hooks/use-investigation-completeness.ts` (line 3)

The hook imports `useEvidenceItems` from `./use-evidence-items` — a **stub file** that always returns an empty array:

```typescript
// src/features/investigation/hooks/use-evidence-items.ts (STUB)
export function useEvidenceItems(incidentId: string | null) {
  return useQuery({
    queryKey: ['evidence-items', incidentId],
    queryFn: async () => [] as unknown[],  // ALWAYS EMPTY
    enabled: !!incidentId,
  });
}
```

The **real** implementation lives at `@/hooks/use-evidence-items/use-evidence-queries.ts` and queries the `incident_evidence` table.

**Impact:** `SubmitInvestigationCard` always shows "Evidence Uploaded (min. 1)" as unchecked (red X) in the UI checklist, even when evidence exists. The submit button remains disabled because `completeness.isComplete` is always `false` (since `hasEvidence` is always false).

However, the server-side `check_investigation_readiness` RPC performs its own evidence check, so if a user clicks submit (when it becomes enabled via other conditions), the server gate would catch it. But since the client-side completeness blocks the button from ever being enabled, **investigators cannot submit their investigation at all** through the standard UI flow.

**Fix:** Change the import in `use-investigation-completeness.ts` from `./use-evidence-items` to `@/hooks/use-evidence-items`:

```typescript
import { useEvidenceItems } from '@/hooks/use-evidence-items';
```

Then delete the stub file `src/features/investigation/hooks/use-evidence-items.ts`.

---

### Finding 2: MEDIUM — `InvestigationWorkflowCards` missing `pending_closure` status case

When an investigation is submitted (status → `pending_closure`), the `InvestigationWorkflowCards` switch statement has no explicit `case 'pending_closure'` entry. It falls through to the `default: return null` case, meaning no workflow card is rendered for HSSE Managers to act on.

The `pending_final_closure` status IS handled (maps to `HSSEIncidentValidationCard`), and `pending_closure` appears in the `InvestigationWorkflowStatusCard` stepper. But the actual action card for the HSSE Manager to approve/reject the closure submission is missing from the workflow cards.

**Mitigation:** The `HSSEIncidentValidationCard` checks for `pending_final_closure` and `pending_hsse_incident_validation` but NOT `pending_closure`. If the `submitInvestigation` service sets status to `pending_closure`, there is no UI card for the next actor to act on this status.

**Fix:** Add `pending_closure` as a case in `InvestigationWorkflowCards` mapping to the appropriate validation/closure approval card. Also add `pending_closure` to the `validStatuses` array in `HSSEIncidentValidationCard.tsx`.

---

## Verified Clean

| Area | Status |
|------|--------|
| Incident creation (3-step wizard with AI analysis) | CLEAN |
| AI classification and severity assignment | CLEAN — analyze-incident edge function, confidence display, translation gate |
| Notification dispatch on submission | CLEAN — `dispatch-incident-notification` triggered |
| Severity-based routing (L1-2 → Expert, L3-5 → Team Investigation) | CLEAN |
| Investigator assignment (single + team) | CLEAN — `InvestigatorAssignmentStep` / `TeamInvestigationAssignmentStep` |
| Evidence Manager (upload, review, delete, CCTV, types) | CLEAN — uses real `@/hooks/use-evidence-items` |
| Witness Panel (text, voice, upload, task assignment, review) | CLEAN |
| RCA Panel (5 Whys, Root Causes, Contributing Factors, AI assist) | CLEAN — auto-save, lock/unlock, category enforcement, 50-char minimum |
| RCA Lock/Unlock (server-side RPCs) | CLEAN |
| Corrective Action creation linked to root causes | CLEAN — `linked_root_cause_id` + `linked_cause_type` |
| Cause Coverage indicator | CLEAN — tracks action coverage per root cause and contributing factor |
| Action verification (return_count, emails, audit logs) | CLEAN — aligned in Pass 8-11 |
| Investigation submission with server-side readiness gate | CLEAN — `check_investigation_readiness` RPC |
| Closure prerequisites card (7-point checklist) | CLEAN |
| Edit access control (investigator, consultant, locked states) | CLEAN |
| Observation → Incident escalation (upgrade + backlink) | CLEAN |
| Workflow status trackers (5-step unified + 6-step observation) | CLEAN |
| Audit trail (all mutations log to `incident_audit_logs`) | CLEAN |
| SLA monitoring (`hsse-cron` hourly check, 30-day breach flag) | CLEAN |
| Monitoring phases (30/60/90 day) | CLEAN — `MonitoringCheckCard` |

---

## Files to Edit

| Priority | File | Change |
|----------|------|--------|
| HIGH | `src/features/investigation/hooks/use-investigation-completeness.ts` | Change import from `./use-evidence-items` to `@/hooks/use-evidence-items` |
| HIGH | `src/features/investigation/hooks/use-evidence-items.ts` | Delete this stub file |
| MEDIUM | `src/pages/incidents/InvestigationWorkspace/components/InvestigationWorkflowCards.tsx` | Add `case 'pending_closure':` mapping to `HSSEIncidentValidationCard` |
| MEDIUM | `src/features/investigation/components/HSSEIncidentValidationCard.tsx` | Add `'pending_closure'` to `validStatuses` array (line 43) |

