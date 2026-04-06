

# Fix: `gen_random_bytes(integer) does not exist` on PTW Permit Submission

## Root Cause

The database trigger function `generate_reference_id_and_qr()` calls `public.gen_random_bytes(16)`, but the `pgcrypto` extension is installed in the `extensions` schema, not `public`. So `public.gen_random_bytes` does not exist.

## Fix

**One database migration** to recreate the function using `extensions.gen_random_bytes(16)` instead of `public.gen_random_bytes(16)`.

```sql
CREATE OR REPLACE FUNCTION public.generate_reference_id_and_qr()
RETURNS TRIGGER AS $$
DECLARE
  year_suffix TEXT;
  sequence_num INTEGER;
BEGIN
  year_suffix := TO_CHAR(NOW(), 'YYYY');

  SELECT COALESCE(MAX(
    CAST(NULLIF(SPLIT_PART(reference_id, '-', 3), '') AS INTEGER)
  ), 0) + 1
  INTO sequence_num
  FROM ptw_permits
  WHERE tenant_id = NEW.tenant_id
    AND reference_id LIKE 'PTW-' || year_suffix || '-%';

  NEW.reference_id := 'PTW-' || year_suffix || '-' || LPAD(sequence_num::text, 5, '0');
  NEW.qr_code_token := 'PTW-' || encode(extensions.gen_random_bytes(16), 'hex');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

No frontend code changes needed. This is a single-line schema reference fix (`public.` → `extensions.`).

## Files Changed

| File | Change |
|------|--------|
| New migration SQL | Replace `public.gen_random_bytes` with `extensions.gen_random_bytes` in `generate_reference_id_and_qr()` |

