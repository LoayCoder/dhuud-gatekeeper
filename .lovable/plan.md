
# Fix: Gate Pass Item Photos Not Saving to Database

## Problem Identified

When users attach photos to gate pass items, the photos are successfully uploaded to storage but the **database records in `gate_pass_item_photos` are not being created**. This causes photos to not display in the gate pass detail view.

### Root Cause

The RLS (Row Level Security) policies on the `gate_pass_item_photos` table use a **JWT-based tenant check** that doesn't work:

```sql
tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
```

This fails because users' JWTs do **NOT contain `tenant_id` in app_metadata** - the tenant_id is stored in the `profiles` table instead.

Other working tables (like `gate_pass_items`) use the correct approach:

```sql
tenant_id = get_auth_tenant_id()
```

The `get_auth_tenant_id()` function properly looks up the tenant_id from the profiles table.

---

## Solution

Update all 4 RLS policies on `gate_pass_item_photos` table to use the `get_auth_tenant_id()` function instead of the failing JWT check.

### Database Migration

```sql
-- Drop existing broken policies
DROP POLICY IF EXISTS "Tenant isolation for item photos select" ON public.gate_pass_item_photos;
DROP POLICY IF EXISTS "Users can insert own item photos" ON public.gate_pass_item_photos;
DROP POLICY IF EXISTS "Users can update own item photos" ON public.gate_pass_item_photos;
DROP POLICY IF EXISTS "Users can delete own item photos" ON public.gate_pass_item_photos;

-- Create fixed policies using get_auth_tenant_id()

-- SELECT: All users in tenant can view item photos
CREATE POLICY "Tenant isolation for item photos select"
ON public.gate_pass_item_photos
FOR SELECT
USING (
  tenant_id = get_auth_tenant_id()
  AND deleted_at IS NULL
);

-- INSERT: Users can insert photos for their tenant
CREATE POLICY "Users can insert own item photos"
ON public.gate_pass_item_photos
FOR INSERT
WITH CHECK (
  tenant_id = get_auth_tenant_id()
  AND uploaded_by = auth.uid()
);

-- UPDATE: Users can update their own photos
CREATE POLICY "Users can update own item photos"
ON public.gate_pass_item_photos
FOR UPDATE
USING (
  tenant_id = get_auth_tenant_id()
  AND uploaded_by = auth.uid()
);

-- DELETE: Users can soft-delete their own photos
CREATE POLICY "Users can delete own item photos"
ON public.gate_pass_item_photos
FOR DELETE
USING (
  tenant_id = get_auth_tenant_id()
  AND uploaded_by = auth.uid()
);

-- Also add admin access policy for complete management
CREATE POLICY "Admins can manage all item photos"
ON public.gate_pass_item_photos
FOR ALL
USING (
  tenant_id = get_auth_tenant_id()
  AND is_admin(auth.uid())
);
```

---

## Expected Outcome

After applying this migration:

1. Photo database records will be successfully inserted when users upload photos
2. Photos will display correctly in gate pass detail views
3. Existing uploaded files in storage will become accessible once new photos are saved

---

## Files to Modify

| File | Action | Description |
|:-----|:-------|:------------|
| Database Migration | Execute | Fix RLS policies on `gate_pass_item_photos` table |

---

## Technical Note

The photos that were previously uploaded to storage still exist - only the database records failed to save. After applying this fix:
- New gate passes will work correctly
- Existing gate passes that had this issue will still be missing their photo records (storage files exist but no DB reference)
