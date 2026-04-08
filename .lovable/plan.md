

# Gate Pass Workflow Audit Report

## ✅ Compliance Summary

**Overall Status: NOT COMPLIANT**

The system has significant gaps against the required design. The mandatory **Acknowledgment layer** is partially implemented at the database level for public passes only, but is completely absent from the frontend, the main approval RPC, and internal/external workflows. Legacy statuses remain scattered across 47+ files.

---

## ⚠️ Issues Found

### CRITICAL Issues

**C1. Acknowledgment step does NOT exist in the main approval RPC**
The `approve_gate_pass_unified` function (latest migration `20260407204636`) routes `contractor` and `dept_approval` stages **directly to `pending_security_approval`**, completely skipping acknowledgment. There is no `WHEN 'pending_acknowledgment'` or `WHEN 'acknowledgment'` case in this function. Security approval happens immediately after dept/contractor approval.

**C2. No `gate_pass_acknowledger` role exists**
Search for `gate_pass_acknowledger` returns zero results across the entire codebase and all migrations. No role has been created to govern who can perform acknowledgments. The `can_approve_gate_pass` function has no case for an acknowledgment stage.

**C3. `pending_acknowledgment` status is orphaned — only used in public `submit_public_gate_pass`**
The public gate pass submission function (migration `20260406135308`) inserts passes with `status = 'pending_acknowledgment'`, but:
- The frontend has **zero references** to `pending_acknowledgment` (confirmed by search)
- `approve_gate_pass_unified` has no `WHEN 'pending_acknowledgment'` case — these passes are **permanently stuck** and cannot be approved
- `can_approve_gate_pass` has no handler for this status
- No UI badge, status label, or approval card recognizes this status

**C4. Internal workflow skips acknowledgment entirely**
Current actual flow: `pending_dept_approval → pending_security_approval → approved`
Required flow: `pending_dept_approval → pending_acknowledgment → pending_security_approval → approved`

**C5. External/Contractor workflow skips acknowledgment entirely**
Current actual flow: `pending_contractor_approval → pending_security_approval → approved`
Required flow: `pending_contractor_approval → pending_acknowledgment → pending_security_approval → approved`

**C6. `rejectGatePass` function skips all notifications and audit logs**
The `rejectGatePass` function (line 153-163 of `materialGatePassActionService.ts`) calls `approve_gate_pass_unified` with `action: "reject"` but does NOT execute any of the notification logic (WhatsApp, public notification, in-app notification, audit log) that `approveGatePass` does. All rejections via `useRejectGatePass` are **silent** — no audit trail, no notifications.

### MAJOR Issues

**M1. Public gate pass has no department selection**
The public request form (`PublicRequestPage.tsx`) has no department selector. The word "department" does not appear anywhere in the public gate pass page files. Users select a **branch** only. The required design mandates department selection to resolve the approver (Dept Rep or Manager).

**M2. `ApprovalFlowPreview` shows only 2 steps, missing acknowledgment**
The preview component shows: Department Manager → Security Supervisor → Approved. It should show 3 steps: Department Approval → Gate Pass Acknowledgment → Security Supervisor → Approved.

**M3. `workflow-definitions.ts` still shows legacy "Golf Club Management" step**
Both `internalGatePassWorkflow` and `externalGatePassWorkflow` include a step labeled "Golf Club Management Acknowledgment" with `dbStatus: 'pending_club_mgmt_ack'`. This status is never produced by the current RPC (which skips it). The workflow diagrams shown to users are **incorrect**.

**M4. 47 files still reference `pending_club_mgmt_ack`**
365 occurrences across 47 files. This legacy status is never produced by the current system but clutters code, status maps, badge labels, and filter dropdowns.

**M5. Legacy statuses `pending_pm_approval`, `pending_safety_approval` still handled in RPC**
The `approve_gate_pass_unified` function still has `WHEN 'pm'` and `WHEN 'safety'` branches that route through a dead `pm → safety → approved` path. No code path can produce these statuses.

### MINOR Issues

**m1. `GatePassApprovalActions.tsx` lists legacy statuses as actionable**
`pendingStatuses` array includes `pending_club_mgmt_ack`, `pending_pm_approval`, `pending_safety_approval`, `pending_dept_ack` — none of which are produced by the current system.

**m2. `use-quick-action-counts.ts` queries for dead statuses**
Counts `pending_pm_approval` and `pending_safety_approval` which always return 0.

**m3. Boolean `can_approve_gate_pass` has stale `pending_club_mgmt_ack` case**
The boolean version still checks for `pending_club_mgmt_ack` with `department_representative` or `department_manager` roles, but this status is never produced.

---

## 🔧 Recommended Fixes

### Phase 1: Database — Create Acknowledgment Infrastructure (Migration)

1. **Insert `gate_pass_acknowledger` role** into the `roles` table
2. **Update `approve_gate_pass_unified`:**
   - `contractor` stage → route to `pending_acknowledgment` (not `pending_security_approval`)
   - `dept_approval` stage → route to `pending_acknowledgment` (not `pending_security_approval`)
   - Add new `WHEN 'pending_acknowledgment'` case → route to `pending_security_approval`, record acknowledger in `club_mgmt_ack_by/at/notes` columns (reuse existing columns)
   - Remove dead `pm` and `safety` cases
3. **Update `can_approve_gate_pass` (JSONB version):**
   - Add `WHEN 'acknowledgment'` case: allow users with `gate_pass_acknowledger` role
4. **Update `can_approve_gate_pass` (boolean version):**
   - Add `WHEN 'pending_acknowledgment'` case: check for `gate_pass_acknowledger` role
5. **Migrate stuck records:** Any passes in `pending_club_mgmt_ack` → move to `pending_acknowledgment`

### Phase 2: Frontend — Add `pending_acknowledgment` Status Support

6. **Add `pending_acknowledgment`** to all status maps across ~28 files:
   - `GatePassApprovalActions.tsx` — add to `pendingStatuses`, add `getActionLabel` case
   - `GatePassApprovalQueue.tsx` — add `getApprovalStage` case
   - `GatePassDetailDialog` — add variant, label, isPendingAction entry
   - All status badge maps, filter dropdowns, PDF templates
   - `materialGatePassQueryService.ts` — add acknowledger query path
   - `use-quick-action-counts.ts` — count `pending_acknowledgment`
7. **Remove legacy status references** (`pending_club_mgmt_ack`, `pending_pm_approval`, `pending_safety_approval`, `pending_dept_ack`) from all frontend files
8. **Update `ApprovalFlowPreview.tsx`** — add "Gate Pass Acknowledgment" as step 2 (3 steps total)
9. **Update `workflow-definitions.ts`** — replace `club_mgmt_ack` with `gate_pass_acknowledgment` step in both workflows

### Phase 3: Fix `rejectGatePass` Silent Failures

10. **Replace `rejectGatePass`** function body to call `approveGatePass(passId, "reject", reason, userId)` instead — this ensures rejections trigger the same audit logs, WhatsApp notifications, and public notifications as approvals

### Phase 4: Public Gate Pass — Department Selection

11. **Add department selector** to `PublicRequestPage.tsx` Step 1
    - Query departments filtered by selected branch (only departments with a dept rep or manager)
    - Display resolved approver name after selection
    - Pass `department_id` to `submit_public_gate_pass`
12. **Update `submit_public_gate_pass` SQL function** to accept and store `department_id`

### Phase 5: Notifications

13. **Update gate pass notification edge functions** to notify `gate_pass_acknowledger` role users when status changes to `pending_acknowledgment`
14. **Notify security supervisors** when acknowledger acts (existing flow for `pending_security_approval`)

---

## 🔍 Missing Components

| Component | Status |
|-----------|--------|
| `gate_pass_acknowledger` role in DB | **NOT CREATED** |
| `pending_acknowledgment` handling in `approve_gate_pass_unified` | **NOT IMPLEMENTED** |
| `pending_acknowledgment` handling in `can_approve_gate_pass` | **NOT IMPLEMENTED** |
| `pending_acknowledgment` in any frontend status map | **NOT IMPLEMENTED** |
| Department selector in public gate pass form | **NOT IMPLEMENTED** |
| Acknowledgment step in `ApprovalFlowPreview` | **NOT IMPLEMENTED** |
| Rejection notifications/audit (via `rejectGatePass`) | **BROKEN** — silent failures |
| Workflow diagrams matching actual system | **STALE** — show legacy Golf Club step |
| Acknowledger notification triggers | **NOT IMPLEMENTED** |

---

## Summary

The plan from the previous conversation correctly identified the problems but **was never implemented**. The only changes applied were:
1. Photo upload bug fixes (completed successfully)
2. `approve_gate_pass_unified` modified to skip `club_mgmt_ack` (routing directly to security)
3. Public `submit_public_gate_pass` uses `pending_acknowledgment` status — but nothing can process it

The acknowledgment layer needs to be built end-to-end: role creation, RPC routing, authorization checks, frontend status support, UI flow preview, public department selection, and notification triggers.

