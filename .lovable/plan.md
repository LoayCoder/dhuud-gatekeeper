

# Fix: ID Card Send via WhatsApp/Email Failing

## Root Cause

The network logs reveal the exact error: uploading the generated card image to the `id-cards` storage bucket returns **403 — "new row violates row-level security policy"**.

The `id-cards` bucket has SELECT and INSERT policies but **no UPDATE policy**. The code uses `upsert: true` (which requires UPDATE permission when the file already exists). After the first failed attempt creates a partial record, every subsequent attempt fails because it tries to update an existing object.

This means `uploadToStorage()` returns `null` → `result.frontImageUrl` is undefined → the toast shows "Failed to generate card" and WhatsApp sending never executes.

## Fix

### Step 1: Database Migration — Add UPDATE policy to `id-cards` bucket

```sql
CREATE POLICY "Tenant users can update ID cards"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'id-cards'
  AND (storage.foldername(name))[1] = (
    SELECT profiles.tenant_id::text FROM profiles WHERE profiles.id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'id-cards'
  AND (storage.foldername(name))[1] = (
    SELECT profiles.tenant_id::text FROM profiles WHERE profiles.id = auth.uid()
  )
);
```

### Step 2: Add fallback in `use-id-card-generator.ts`

If `saveToStorage` fails (e.g. bucket doesn't exist yet), fall back to using the data URL directly so the user can still download/print even if WhatsApp send requires the uploaded URL.

Currently the code returns `{ success: false }` when upload fails. Instead, keep the data URL as `frontImageUrl` so download/print still works, and only fail WhatsApp if the upload specifically failed.

### Summary

| File | Change |
|------|--------|
| DB Migration | Add UPDATE policy for `id-cards` storage bucket |
| `src/hooks/use-id-card-generator.ts` | Graceful fallback when upload fails — use data URL for download/print |

No edge function changes needed — the `send-id-card-notification` function itself works fine; it just never gets called because the image upload fails before reaching that step.

