# Gate Pass Workflow: Golf Club Management Acknowledgment

## Status: ✅ COMPLETED

## Summary

Added the **Golf Club Management acknowledgment** step to the Gate Pass workflow. Users with `department_representative` or `department_manager` role who belong to the "Golf Club Management" department can now approve gate passes at the `pending_club_mgmt_ack` stage.

## Changes Made

### Database Functions (Migration Applied)

1. **`can_approve_gate_pass`**: Added `club_mgmt_ack` case that validates:
   - User has `department_representative` or `department_manager` role
   - User's `assigned_department_id` matches Golf Club Management department
   - Admins can always approve as fallback

2. **`get_user_pending_gate_passes`**: Updated to show `pending_club_mgmt_ack` passes to Golf Club Management department representatives.

### Translation Keys Added

| Key | English | Arabic |
|:----|:--------|:-------|
| `contractors.passStatus.pendingClubMgmtAck` | Pending Golf Club Management | بانتظار إدارة نادي الجولف |
| `contractors.gatePasses.awaitingClubMgmtAck` | Awaiting Golf Club Management Acknowledgment | بانتظار إقرار إدارة نادي الجولف |
| `contractors.gatePassDetail.timeline.clubMgmtAck` | Golf Club Management acknowledged | أقرت إدارة نادي الجولف |
| `gatePasses.status.pending_club_mgmt_ack` | Pending Golf Club Management | بانتظار إدارة نادي الجولف |

### Components Updated

- `GatePassApprovalQueue.tsx` - Updated stage label
- `GatePassListTable.tsx` - Updated status label
- `GatePassDetailDialog.tsx` - Updated status label + added timeline event
- `my-gate-passes/List.tsx` - Updated status label

## Workflow Diagram

```text
EXTERNAL (Contractor):
Request → Contractor Consultant → Golf Club Management → Security Supervisor → APPROVED

INTERNAL (Employee):
Request → User's Dept Rep/Manager → Golf Club Management → Security Supervisor → APPROVED
```
