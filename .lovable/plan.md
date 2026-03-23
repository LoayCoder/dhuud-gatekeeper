

# Fix: "Failed to save part result" — Root Cause & Resolution

## Root Cause (Critical)

The RLS policies on `asset_inspection_part_results` and `asset_type_parts` check tenant ownership via:
```sql
tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
```

**However, NO users in the system have `tenant_id` set in their JWT `app_metadata`.** The query `SELECT raw_app_meta_data->>'tenant_id' FROM auth.users` returns NULL for all users. This means every INSERT and UPDATE is silently blocked by RLS — the database returns zero rows, causing the `.single()` call to fail.

The working pattern used elsewhere (e.g., `contractors`, `gate_entry_logs`) looks up tenant via the profiles table:
```sql
tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid() AND deleted_at IS NULL)
```

## Fix

**Single database migration** to replace the 8 broken RLS policies (4 on each table) with the profiles-based pattern:

### `asset_inspection_part_results` (4 policies)
Drop all 4 existing policies and recreate using:
```sql
USING (tenant_id IN (
  SELECT tenant_id FROM public.profiles 
  WHERE id = auth.uid() AND deleted_at IS NULL
))
```
With matching `WITH CHECK` on INSERT and UPDATE.

### `asset_type_parts` (4 policies)
Same fix — these policies also use the broken `app_metadata` pattern and would fail for the same reason.

## Files to Modify
- **Database migration only** — no code changes needed. The hook logic in `use-part-inspection-results.ts` is correct; it properly sets `tenant_id` from the profile. The RLS was just blocking the operation.

