

# Fix: Authenticated Users Cannot Upload Photos to Public Gate Pass

## Root Cause

The storage RLS policies have a gap:
- **Anon users** can upload to `public-gate-pass-photos` ✅
- **Authenticated users** can only upload to `gate-pass-photos` (the internal bucket) ❌

When you're logged in and use the public gate pass form at `/{tenantSlug}/request`, your session is `authenticated`, not `anon`. The upload to `public-gate-pass-photos` is rejected by RLS.

## Fix

Add a single RLS policy allowing authenticated users to INSERT into the `public-gate-pass-photos` bucket.

### Migration SQL

```sql
CREATE POLICY "Authenticated can upload public gate pass photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'public-gate-pass-photos');
```

### No code changes needed
The frontend upload logic in `PublicRequestPage.tsx` is correct — it targets the right bucket (`public-gate-pass-photos`) with the right path structure. Only the storage policy is missing.

## Impact
- Safe: read-only SELECT policy already exists for both roles
- This only adds INSERT permission for authenticated users on the public bucket
- Does not affect any other bucket or policy

