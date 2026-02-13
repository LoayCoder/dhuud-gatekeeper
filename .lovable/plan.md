
## Fix: Action Closure and Avg Investigation KPI Cards Showing 0.00

### Root Cause Analysis

**Action Closure (0.00%)**:
The `get_leading_indicators` RPC counts actions where `status = 'completed'`, but no corrective action in the database has that status. The actual statuses in use are `assigned` and `in_progress`. The app's own Corrective Action Donut Chart expects statuses like `closed`, `pending_verification`, and `overdue` -- but `completed` is never used. The RPC needs to count **all closure-equivalent statuses** (`completed`, `closed`, `verified`) to accurately reflect action closure rate.

**Avg Investigation (0.00 days)**:
The `get_response_metrics` RPC joins the `investigations` table and requires `completed_at IS NOT NULL`. However, **all 8 investigations have `completed_at = NULL`**. The system actually tracks investigation completion through:
- `incidents.investigation_approved_at` (the approval timestamp)
- `incidents.status = 'investigation_closed'` (2 incidents have this status)

The RPC never checks these fields, so it sees zero completed investigations and returns 0.

### Database Fixes

**1. Fix `get_response_metrics` RPC:**
- For avg investigation days: Use `incidents.investigation_approved_at` as the completion marker (falling back to `investigations.completed_at` if present)
- Also consider incidents with `status = 'investigation_closed'` as completed
- Calculate duration from `incidents.occurred_at` to the completion timestamp
- For within-target percentage: Same logic, check if duration is within 14 days

**2. Fix `get_leading_indicators` RPC (action closure only):**
- Change the closed-actions filter from `status = 'completed'` to `status IN ('completed', 'closed', 'verified')` to catch all closure-equivalent statuses

### Changes Summary

```text
+----------------------------+-----------------------------------+-----------------------------------+
| Metric                     | Before (broken)                   | After (fixed)                     |
+----------------------------+-----------------------------------+-----------------------------------+
| Action Closure %           | Counts status = 'completed' only  | Counts 'completed', 'closed',     |
|                            | (no records match)                | 'verified' statuses               |
+----------------------------+-----------------------------------+-----------------------------------+
| Avg Investigation Days     | Requires investigations.          | Uses incidents.                   |
|                            | completed_at (always NULL)        | investigation_approved_at or      |
|                            |                                   | status = 'investigation_closed'   |
+----------------------------+-----------------------------------+-----------------------------------+
| Within Target %            | Same broken dependency            | Same fix as above                 |
+----------------------------+-----------------------------------+-----------------------------------+
```

### Files Changed

- **Database migration only**: One migration file to update both `get_response_metrics` and `get_leading_indicators` RPCs
- **No frontend changes needed** -- the hooks and components already handle the returned data correctly; only the SQL calculations are wrong

### Expected Result

- **Action Closure**: Will correctly show the percentage of corrective actions that have been completed/closed/verified
- **Avg Investigation**: Will show the actual average days from incident occurrence to investigation approval/closure for the 2 incidents that have reached `investigation_closed` status
- Both cards will display real numbers instead of 0.00
