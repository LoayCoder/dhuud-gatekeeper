

## Fix: Avg Investigation Days Still Showing 0.00

### Root Cause

The previous fix correctly expanded the WHERE clause to match incidents with `status = 'investigation_closed'`, but the **duration calculation** still fails because it uses:

```
COALESCE(inv.completed_at, i.investigation_approved_at) - i.occurred_at
```

For the 2 closed investigations, **both** `inv.completed_at` and `i.investigation_approved_at` are NULL. The COALESCE returns NULL, making the entire expression NULL, and `AVG(NULL)` returns 0.

### The Fix

Add `i.updated_at` as a third fallback in the COALESCE chain. When an incident transitions to `investigation_closed`, its `updated_at` timestamp reflects when that closure happened.

```text
Before:  COALESCE(inv.completed_at, i.investigation_approved_at)
After:   COALESCE(inv.completed_at, i.investigation_approved_at, i.updated_at)
```

This applies in two places within the `get_response_metrics` RPC:
1. The AVG calculation (line 167)
2. The within-target FILTER clause (line 190)

### Action Closure: No Fix Needed

Action Closure showing 0.00% is **correct**. All 6 corrective actions are in `assigned` (5) or `in_progress` (1) status. None have been closed yet.

### Expected Result After Fix

- Incident 1: Dec 8, 2025 to Jan 9, 2026 = ~31 days
- Incident 2: Jan 6, 2026 to Feb 9, 2026 = ~34 days
- **Avg Investigation Days: ~32.5 days** (instead of 0.00)
- **Within Target (14 days): 0.0%** (both exceed 14 days, which is accurate)

### Files Changed

- **Database migration only**: One migration to update the `get_response_metrics` RPC with the additional COALESCE fallback
- No frontend changes needed

