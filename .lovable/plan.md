

# Gate Pass Sequence is NOT Tenant-Scoped — Fix Required

## Finding

The `gate_pass_ref_seq` is a **single global PostgreSQL sequence** shared by all tenants. This means:

- Tenant A creates pass → gets sequence 1
- Tenant B creates pass → gets sequence 2 (skipping 1)
- Numbers have gaps per tenant and leak cross-tenant volume info

The `public_gate_pass_ref_sequence` has the same problem for public passes.

## Fix: Replace Global Sequence with Per-Tenant Counter

PostgreSQL sequences are global objects — you can't have one per tenant. The correct approach is a **counter table**.

### 1. Migration: Create `gate_pass_counters` table

```sql
CREATE TABLE public.gate_pass_counters (
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  counter_type TEXT NOT NULL DEFAULT 'internal', -- 'internal' or 'public'
  current_value BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, counter_type)
);

ALTER TABLE public.gate_pass_counters ENABLE ROW LEVEL SECURITY;
```

### 2. Migration: Create `next_gate_pass_ref` function (tenant-scoped)

```sql
CREATE OR REPLACE FUNCTION public.next_gate_pass_ref(p_tenant_id UUID, p_counter_type TEXT DEFAULT 'internal')
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next BIGINT;
BEGIN
  INSERT INTO gate_pass_counters (tenant_id, counter_type, current_value)
  VALUES (p_tenant_id, p_counter_type, 1)
  ON CONFLICT (tenant_id, counter_type)
  DO UPDATE SET current_value = gate_pass_counters.current_value + 1
  RETURNING current_value INTO v_next;
  
  RETURN v_next;
END;
$$;
```

This uses `INSERT ... ON CONFLICT ... UPDATE` (upsert) which is atomic and race-condition safe.

### 3. Backfill counters from existing passes

Count existing passes per tenant and seed the counters so new passes continue from the correct number.

### 4. Update `materialGatePassCreateService.ts`

Replace:
```ts
supabase.rpc("nextval_gate_pass_ref")
```
With:
```ts
supabase.rpc("next_gate_pass_ref", { p_tenant_id: tenantId, p_counter_type: 'internal' })
```

### 5. Update `submit_public_gate_pass` SQL function

Replace `nextval('public_gate_pass_ref_sequence')` with a call to `next_gate_pass_ref(v_tenant_id, 'public')`.

## Files to Edit

| File | Change |
|------|--------|
| New migration | Create `gate_pass_counters` table, `next_gate_pass_ref` function, backfill |
| `materialGatePassCreateService.ts` | Call `next_gate_pass_ref` with tenant_id |
| Migration (update `submit_public_gate_pass`) | Use tenant-scoped counter for public passes |

