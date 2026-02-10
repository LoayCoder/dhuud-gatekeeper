

## Fix: "column deleted_at does not exist" in Public Gate Pass Submission

### Root Cause

The `submit_public_gate_pass` database function contains this query on **line 45**:

```sql
SELECT id, name, allow_public_gate_pass_requests INTO v_tenant_record
FROM tenants WHERE slug = p_tenant_slug AND deleted_at IS NULL;
```

The `tenants` table **does not have a `deleted_at` column**. This causes the error every time a public gate pass is submitted.

### Fix (Single Migration)

Remove the `AND deleted_at IS NULL` filter from the tenant lookup in the `submit_public_gate_pass` function. The line should become:

```sql
SELECT id, name, allow_public_gate_pass_requests INTO v_tenant_record
FROM tenants WHERE slug = p_tenant_slug;
```

### Bonus Fix (Same Migration)

While auditing, I also found a recurring error: **`column security_zones_1.name does not exist`** in `src/hooks/use-security-reports.ts`. The `security_zones` table uses `zone_name`, not `name`. Three places in that file reference `.name` instead of `.zone_name`:

1. **Line 119-121**: Join select uses `name` instead of `zone_name`
2. **Line 346**: Join select uses `name` instead of `zone_name`  
3. **Lines 625-627**: Direct query selects `id, name` and orders by `name` -- should be `zone_name`

### Changes Summary

| File | Change |
|------|--------|
| **Database migration** | Update `submit_public_gate_pass` function to remove `deleted_at IS NULL` from `tenants` query |
| **`src/hooks/use-security-reports.ts`** | Replace `name` with `zone_name` in 3 locations for `security_zones` queries |

### Technical Details

**Migration SQL** will re-create the `submit_public_gate_pass` function with the single-line fix on the tenant lookup query. The rest of the function remains unchanged.

**Frontend fix** in `use-security-reports.ts`:
- Line 120: `name` to `zone_name`
- Line 346: `name` to `zone_name`  
- Lines 625/627: `name` to `zone_name`

