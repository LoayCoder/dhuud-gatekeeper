

# E2E Audit — Corrective Action Lifecycle — Pass 10

## Overall Status: ✅ PASS (Conditional — 1 LOW finding)

Previous passes (7, 8, 9) addressed the critical gaps: verification logic alignment, cache invalidation, and `return_count` tracking. This pass validates the full lifecycle end-to-end.

---

## Lifecycle Validation Summary

```text
Creation (assigned) → in_progress → completed → [Verification] → closed
                                        ↑                ↓
                                        └── returned_for_correction
```

### 1. Action Creation & Data Integrity — CLEAN

| Source | Hook/Service | Status |
|--------|-------------|--------|
| Incident RCA | `useCreateCorrectiveAction` (investigation-mutations) | Sets `status: assigned`, `tenant_id`, `branch_id`, creates audit log |
| Inspection Finding | `useCreateActionFromFinding` (use-action-mutations) | Sets `source_type: inspection`, `source_finding_id`, links finding, sends assignment email |
| Area Inspection Finding | `use-findings-mutations` | Sets `source_type: inspection_finding`, `source_finding_id`, `session_id` |

All creation paths set mandatory fields (title, tenant_id, status). Incident-sourced actions inherit `branch_id` from parent incident.

### 2. Source Linking & Traceability — CLEAN

- Incident actions: `incident_id` FK, `released_at` gate (only visible to assignee after investigation release)
- Observation actions: bypass `released_at` gate (visible immediately)
- Inspection actions: `session_id` + `source_finding_id` FKs, finding status updated to `action_assigned`
- Bi-directional navigation: Incident detail → Actions tab → Action detail; My Actions → "View Incident" link

### 3. Assignment & Responsibility — CLEAN

- `assigned_to` FK to profiles
- `responsible_department_id` FK to departments
- Assignment email via `send-action-email` (type: `action_assigned`) for inspection actions
- Incident actions: notification deferred until investigation release (by design)
- My Actions query: `incidentQueryService.ts` filters `assigned_to = user.id`

### 4. Execution & Status Transitions — CLEAN

| Transition | Hook | Fields Set |
|-----------|------|------------|
| assigned → in_progress | `useUpdateMyActionStatus` / `useUpdateInspectionActionStatus` | `started_at`, `progress_notes` |
| in_progress → completed | Same hooks | `completed_date`, `completion_notes`, `overdue_justification` |
| completed → closed (approved) | All 3 verify hooks | `verified_by`, `verified_at`, `verification_notes` |
| completed → returned_for_correction | All 3 verify hooks | `rejected_by`, `rejected_at`, `rejection_notes`, `last_returned_at`, `last_return_reason`, `return_count++` |
| returned_for_correction → in_progress | `useUpdateMyActionStatus` | Re-enters execution cycle |

Optimistic updates implemented for My Actions and Inspection Actions with rollback on error.

### 5. Verification — ALL 3 IMPLEMENTATIONS ALIGNED

| Feature | Pending Approvals | Investigation Workspace | Inspection |
|---------|:-:|:-:|:-:|
| `return_count` increment | ✅ | ✅ (Pass 8 fix) | ✅ (Pass 8 fix) |
| `action_returned` email | ✅ | ✅ (Pass 8 fix) | ❌ |
| `action_closed` email | ✅ | ✅ (Pass 8 fix) | ❌ |
| `incident_audit_logs` entry | ✅ | ✅ (Pass 8 fix) | N/A (no incident_id) |
| Cache invalidation: `pending-action-approvals` | ✅ | ✅ (Pass 8 fix) | N/A |
| Cache invalidation: `my-corrective-actions` | ✅ | ✅ (Pass 8 fix) | N/A |

### 6. Dashboard & Action Center Consistency — CLEAN

- `useActionCenterStats` counts by tenant with module-specific filtering
- `InlineActionsPanel` uses same `useMyCorrectiveActions` + `useUpdateMyActionStatus`
- `useUpdateMyActionStatus` invalidates `my-corrective-actions`, `corrective-actions`, and `pending-action-approvals`

### 7. SLA & Overdue Logic — CLEAN

- SLA countdown stops for terminal statuses (`completed`, `verified`, `closed`)
- Overdue justification mandatory when completing overdue actions
- `hsse-cron` edge function checks SLA breach at hourly intervals

### 8. Audit Trail — CLEAN

- `action_created` logged on creation (incident source)
- `action_updated` logged on field updates
- `action_closed_by_verifier` logged on verification approval (pending-approvals + investigation workspace)
- All entries include `incident_id`, `tenant_id`, `actor_id`

### 9. Access Control — CLEAN

- Verification restricted to HSSE roles via `usePendingApprovals` query (filters by role category)
- `tenant_id` enforced on all queries
- `branch_id` inherited from parent incident

---

## Finding 1: LOW — Inspection `useVerifyAction` missing email notifications

The inspection-specific `useVerifyAction` (use-action-mutations.ts lines 100-162) correctly increments `return_count` on rejection (fixed in Pass 8), but still does NOT send:
- `action_returned` email to assignee on rejection
- `action_closed` email to assignee on approval

This is lower priority because inspection actions may not have an `incident_id` for the email template's `incident_reference` field, and inspection verification volume is typically lower than incident verification. However, for full compliance parity, these emails should be added.

**Fix**: Add email notification logic to the inspection `useVerifyAction`, fetching assignee details and calling `send-action-email` for both rejection and approval paths (similar to the pending-approvals version, but with `incident_reference: null`).

---

## Files to Edit

| Priority | File | Change |
|----------|------|--------|
| LOW | `src/features/incidents/hooks/use-inspection-actions/use-action-mutations.ts` | Add email notifications (`action_returned` / `action_closed`) to `useVerifyAction` |

