

# Fix: HSSE Expert Incorrectly Seeing Contractor Observations in Pending Approvals

## Confirmed Root Cause

In the `can_approve_investigation` RPC (latest version: migration `20260118135335`), line 71:

```sql
IF v_is_hsse_expert THEN RETURN TRUE; END IF;
```

This is inside the contractor consultant workflow block (lines 51-72), which handles statuses like `pending_consultant_screening`. The HSSE Expert check has **no guard** against `v_is_against_contractor`, so any HSSE Expert can approve contractor-specific observations that should only be handled by the Contractor Consultant, Admin, or HSSE Manager.

## Fix

### 1. Database Migration — Fix `can_approve_investigation`

Change line 71 from:
```sql
IF v_is_hsse_expert THEN RETURN TRUE; END IF;
```
To:
```sql
IF v_is_hsse_expert AND NOT v_is_against_contractor THEN RETURN TRUE; END IF;
```

This ensures HSSE Experts can only act on **non-contractor** observations in these statuses. Contractor observations remain restricted to:
- Assigned Contractor Consultant (line 57)
- Admin (line 62)
- HSSE Manager (line 65)

### 2. No Frontend Changes Required

The Pending Approvals query (`use-pending-approval-queries.ts`) already calls `can_approve_investigation` per incident and filters based on the result. Once the RPC is fixed, contractor observations in `pending_consultant_screening` will no longer pass the check for HSSE Experts.

### 3. Dependency Verification

Reviewed all consumers of `can_approve_investigation`:
- **`use-pending-approval-queries.ts`** — Uses RPC as gatekeeper; will auto-correct
- **`use-consultant-workflow.ts`** — Has its own contractor-specific checks; not affected
- **`use-investigation-edit-access.ts`** — Separate edit permission logic; not affected
- **Dashboard counters** — Derive from the same pending approvals query; will auto-correct
- **Notifications** — Routed at submission time via `auto_route_observation_on_submit`; correctly sets `approval_manager_id` to the consultant, not HSSE Expert

### Impact

- Contractor observations in `pending_consultant_screening` stop appearing for HSSE Experts
- Non-contractor observations in these statuses continue working for HSSE Experts
- All pending approval counts correct automatically
- No UI, notification, or other RPC changes needed

