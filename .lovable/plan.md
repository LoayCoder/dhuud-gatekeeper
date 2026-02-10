

## Fix: Tracking Page Shows "Invalid Pass" After Submission

### Root Cause

The `get_public_gate_pass_status` database function queries:

```sql
WHERE mgp.qr_code_token = p_access_token
```

But the tracking URL uses `public_access_token`, not `qr_code_token`. The pass record confirms:
- `public_access_token` = `3fb1c78f-f33c-4038-b340-b06308c1784b` (has value)
- `qr_code_token` = NULL (only generated at approval)

So the lookup always fails for newly submitted passes.

### Fix (Single Migration)

Update the `get_public_gate_pass_status` function to query by `public_access_token` instead of `qr_code_token`:

```sql
-- Change this line:
WHERE mgp.qr_code_token = p_access_token AND mgp.deleted_at IS NULL;
-- To:
WHERE mgp.public_access_token = p_access_token AND mgp.deleted_at IS NULL;
```

Also remove the `deleted_at IS NULL` filter since `material_gate_passes` uses soft deletes via `deleted_at`, but we should verify this column exists (unlike the `tenants` table issue).

### Secondary Fix

The function also references `mgp.deleted_at` -- need to confirm this column exists on `material_gate_passes` (it should, per the soft-delete architecture).

### Changes Summary

| File | Change |
|------|--------|
| Database migration | Update `get_public_gate_pass_status` to use `public_access_token` column |
| Frontend | No changes needed |

