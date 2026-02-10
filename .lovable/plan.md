

## Fix: Permanently Remove Duplicate `submit_public_gate_pass` and Keep One Clean Version

### Problem

Two overloads of `submit_public_gate_pass` exist in the database with different parameter orders. PostgREST cannot resolve the ambiguity, breaking all submissions.

| OID | Parameter Order (key difference) | Body |
|-----|----------------------------------|------|
| 116538 | `...p_pass_date, p_notify_*, p_client_ip, p_items, p_start_date, p_end_date` | Old `photo_path` bug |
| 116541 | `...p_items, p_pass_date, p_notify_*, p_client_ip, p_start_date, p_end_date` | Has `photo_storage_path` fix |

The frontend sends parameters matching OID 116538's order.

### Solution: Single Database Migration

**Step 1** -- Drop both functions by exact type signature:

```sql
DROP FUNCTION IF EXISTS public.submit_public_gate_pass(
  text, uuid, text, text, text, text, text, text, text, text,
  text, text, text, text, date, boolean, boolean, boolean, text, jsonb, date, date
);
DROP FUNCTION IF EXISTS public.submit_public_gate_pass(
  text, uuid, text, text, text, text, text, text, text, text,
  text, text, text, text, jsonb, date, boolean, boolean, boolean, text, date, date
);
```

**Step 2** -- Recreate a single function combining:
- **Parameter order** from OID 116538 (matches the frontend hook)
- **Function body** from OID 116541 (has the `photo_storage_path` fix)

The recreated function signature:
```
(p_tenant_slug text, p_branch_id uuid, p_requester_name text, p_requester_phone text,
 p_requester_email text, p_requester_company text, p_pass_type text,
 p_material_description text, p_quantity text, p_vehicle_plate text,
 p_vehicle_plate_letters text, p_vehicle_plate_numbers text,
 p_driver_name text, p_driver_mobile text, p_pass_date date,
 p_notify_whatsapp boolean, p_notify_email boolean, p_notify_sms boolean,
 p_client_ip text, p_items jsonb, p_start_date date, p_end_date date)
```

The body includes the corrected item-insertion loop:
```sql
jsonb_to_recordset(p_items) AS x(
  sr_number TEXT, item_name TEXT, description TEXT,
  quantity TEXT, unit TEXT, photo_storage_path TEXT,
  photo_file_name TEXT, photo_file_size INTEGER, photo_mime_type TEXT
)
```

### Verification

- Frontend hook (`use-public-gate-pass.ts` line 95-120) sends params in OID 116538 order -- confirmed match
- Frontend sends items with `photo_storage_path` key (line 83) -- confirmed match with new function body
- No frontend changes needed

### Changes Summary

| Target | Action |
|--------|--------|
| Database migration | Drop both duplicate functions, recreate single clean version |
| Frontend | No changes needed |

