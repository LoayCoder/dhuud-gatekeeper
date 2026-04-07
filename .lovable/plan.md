

# Fix RLS Policy for Public Gate Pass Access by Authenticated Users

## Problem
The `tenants` table has an RLS policy "Allow anon read public tenant info" that only applies to the `anon` role. Authenticated users from a different tenant cannot view public gate pass tenant info, forcing them to use incognito mode.

## Solution
Add a new SELECT policy on the `tenants` table that allows **authenticated** users to read tenant rows where `allow_public_gate_pass_requests = true`. This mirrors the existing anon policy but for the `authenticated` role.

## Technical Details

### Migration: Add RLS policy

```sql
CREATE POLICY "Allow authenticated read public gate pass tenant info"
ON public.tenants
FOR SELECT
TO authenticated
USING (allow_public_gate_pass_requests = true);
```

This is safe because:
- It only exposes tenants that have explicitly enabled public gate passes
- It's read-only (SELECT only)
- The existing "Tenant users can view their tenant" policy already covers same-tenant access — this just adds cross-tenant visibility for public gate pass tenants

### No code changes needed
The frontend query in `use-tenant-by-slug.ts` already selects only safe, non-PII columns (name, slug, logo, brand_color, instructions). No application code changes required.

