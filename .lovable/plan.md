

# Simplify Gate Pass Approval to 2-Step Flow

## Summary
Remove the middle "Club Management Acknowledgment" step from the gate pass approval workflow, making it: **Department Manager → Security Supervisor → Approved (QR Generated)**.

## Current Flow (3 steps)
```text
Dept Manager Approval → Club Mgmt Acknowledgment → Security Approval → Approved
```

## New Flow (2 steps)
```text
Dept Manager Approval → Security Approval → Approved
```

## Changes Required

### 1. Database Migration — Update RPC functions

**`approve_gate_pass_unified`**: Change transitions so:
- `dept_approval` stage → sets status to `pending_security_approval` (was `pending_club_mgmt_ack`)
- `contractor` stage → sets status to `pending_security_approval` (was `pending_club_mgmt_ack`)
- Remove `club_mgmt_ack` case entirely (keep for backward compat but skip to security)

**`submit_public_gate_pass`**: Change initial status from `pending_club_mgmt_ack` to `pending_dept_approval` so public requests also go through Dept Manager first.

**`can_approve_gate_pass`**: Keep `club_mgmt_ack` and `dept_ack` cases for backward compatibility with existing passes, but no new passes will enter these states.

**Existing passes**: Migrate any currently stuck in `pending_club_mgmt_ack` to `pending_security_approval`.

### 2. Frontend — UI Label Updates (~12 files)

| File | Change |
|------|--------|
| `ApprovalFlowPreview.tsx` | Remove "Club Management" step, show only 2 steps |
| `GatePassApprovalQueue.tsx` | Remove `pending_club_mgmt_ack` from stage labels |
| `GatePassApprovalActions.tsx` | Remove `pending_club_mgmt_ack` action label |
| `GatePassDetailDialog.tsx` | Remove `pending_club_mgmt_ack` from status map |
| `MyGatePassesTab.tsx` | Remove Club Mgmt filter/badge |
| `GatePassListTable.tsx` | Remove from status badge map |
| `materialGatePassQueryService.ts` | Remove `pending_club_mgmt_ack` from approval queue queries for dept reps |
| `use-dept-gate-pass-queries.ts` | Remove `pending_club_mgmt_ack` query |
| `use-dept-stats-queries.ts` | Remove from stats |
| `gatePassVerificationService.ts` | Remove from status messages |
| `stat-fetchers.ts` | Remove from pending stats |
| `use-my-workflow-tasks.ts` | Remove from status filter |
| `GatePassPDFTemplate.tsx` | Update approval chain display |

### 3. Public Request Flow Fix

Currently public gate pass submissions start at `pending_club_mgmt_ack` (skipping dept manager). With the new flow, they should start at `pending_dept_approval` and route to the tenant's department manager, then to security.

### What stays the same
- The `club_mgmt_ack_by/at/notes` columns remain in the database (no destructive changes)
- Legacy `pending_pm_approval` / `pending_safety_approval` backward compatibility remains
- The `can_approve_gate_pass` function keeps legacy case handling
- Security approval as the final step remains unchanged

