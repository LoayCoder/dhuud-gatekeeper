

## Fix: Duplicate `submit_public_gate_pass` Functions

### Root Cause

The last migration used `CREATE OR REPLACE FUNCTION` but with a **different parameter order** than the existing function. In PostgreSQL, parameter order is part of the function signature, so instead of replacing the old function, it created a **second one**. Now PostgREST cannot choose between them.

### Fix (Single Migration)

1. **DROP both existing functions** by their exact signatures
2. **CREATE one clean function** with the `deleted_at IS NULL` fix included

The single recreated function will use the parameter order from the latest migration (which matches the frontend call).

### Technical Details

**Migration SQL** will:

```text
DROP FUNCTION public.submit_public_gate_pass(text, uuid, text, text, text, text, text, text, text, text, text, text, text, text, date, boolean, boolean, boolean, text, jsonb, date, date);
DROP FUNCTION public.submit_public_gate_pass(text, uuid, text, text, text, text, text, text, text, text, date, text, text, text, text, boolean, boolean, boolean, text, jsonb, date, date);

CREATE OR REPLACE FUNCTION public.submit_public_gate_pass(...)
  -- Single clean version with deleted_at fix applied
  -- Uses: FROM tenants WHERE slug = p_tenant_slug (no deleted_at)
```

**No frontend changes needed** -- the hook already sends the correct parameter names.

| What | Action |
|------|--------|
| Database migration | Drop both duplicate functions, recreate single clean version |
| Frontend | No changes |
