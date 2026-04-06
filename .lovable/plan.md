
# Fix: PTW submission still fails because the wrong trigger function is being used

## What I found

The previous migration changed `public.generate_reference_id_and_qr()`, but the live PTW insert trigger is **not using that function**.

The `ptw_permits` table currently has this trigger:

```sql
trg_generate_ptw_permit_reference
-> public.generate_ptw_permit_reference_id()
```

And the live definition of `public.generate_ptw_permit_reference_id()` still contains:

```sql
NEW.qr_code_token := 'PTW-' || encode(gen_random_bytes(16), 'hex');
```

Because that function runs with `search_path = public`, PostgreSQL looks for `public.gen_random_bytes(integer)`, which does not exist in this backend. That is why PTW submission still throws:

```text
function gen_random_bytes(integer) does not exist
```

## Implementation plan

### 1. Create one corrective database migration
Recreate the **actual triggered function**:

- `public.generate_ptw_permit_reference_id()`

Change only the QR token line to:

```sql
NEW.qr_code_token := 'PTW-' || encode(extensions.gen_random_bytes(16), 'hex');
```

This fixes the PTW permit submission path directly.

### 2. Keep trigger wiring unchanged
Do not change the trigger itself unless needed.

The trigger already points to the correct PTW function:
- `trg_generate_ptw_permit_reference`
- executes `public.generate_ptw_permit_reference_id()`

So the fix is to update the function body, not the trigger.

### 3. Optional hardening in the same migration
There is another function still using the wrong schema:

- `public.generate_gatepass_qr()`

It currently uses `public.gen_random_bytes(16)` too. I would fix that in the same migration to prevent the same error later in gate pass approvals.

### 4. No frontend changes
This issue is fully in the database trigger layer. No React/TypeScript code needs changing for this bug.

## Technical details

### PTW function to fix
Current live function:
```sql
public.generate_ptw_permit_reference_id()
```

Current broken line:
```sql
NEW.qr_code_token := 'PTW-' || encode(gen_random_bytes(16), 'hex');
```

Correct line:
```sql
NEW.qr_code_token := 'PTW-' || encode(extensions.gen_random_bytes(16), 'hex');
```

### Why the earlier migration did not solve it
It updated:
```sql
public.generate_reference_id_and_qr()
```

But the PTW trigger does **not** call that function. So the old broken function remained active in the real submission path.

## Files to change

| File | Change |
|------|--------|
| New migration SQL file | Recreate `public.generate_ptw_permit_reference_id()` with `extensions.gen_random_bytes(16)` |
| Same migration SQL file | Optionally also recreate `public.generate_gatepass_qr()` with `extensions.gen_random_bytes(16)` |

## Expected result

After the migration:
- internal PTW submission should no longer fail with `gen_random_bytes(integer) does not exist`
- reference ID and QR token generation should work during permit insert
- no UI behavior changes are required
