

## Fix: Photos Not Showing on Gate Pass Tracking Page

### Root Cause (Two Bugs)

**Bug 1: Photo path never saved to database (JSONB key mismatch)**

The frontend sends items to the RPC with key `photo_storage_path`:
```js
{ photo_storage_path: "temp-xxx/1-123456.jpg", ... }
```

But the RPC's `jsonb_to_recordset` mapping expects a different key (`photo_path`):
```sql
jsonb_to_recordset(p_items) AS x(
  ..., photo_path TEXT, ...
)
```

Since `photo_storage_path` does not match `photo_path`, PostgreSQL maps it as NULL. This is confirmed by the database showing `photo_storage_path = NULL` for all items, even though:
- Photos ARE successfully uploaded to the `public-gate-pass-photos` storage bucket
- `photo_file_name`, `photo_file_size`, and `photo_mime_type` save correctly (their keys match)

**Bug 2: Tracking RPC doesn't return photo data**

The `get_public_gate_pass_status` function builds item JSON with only 5 fields:
```sql
'id', pi.id, 'item_name', pi.item_name, 'description', pi.description,
'quantity', pi.quantity, 'unit', pi.unit
```

Missing: `photo_storage_path` and `sr_number`. Even if Bug 1 were fixed, photos still wouldn't appear on the tracking page.

### Fix Plan

**1. Database Migration -- Fix `submit_public_gate_pass`**

Change the `jsonb_to_recordset` column alias from `photo_path` to `photo_storage_path` so it matches the frontend JSONB key:

```sql
-- Before:
jsonb_to_recordset(p_items) AS x(
  ..., photo_path TEXT, ...
)
-- After:
jsonb_to_recordset(p_items) AS x(
  ..., photo_storage_path TEXT, ...
)
```

And update the INSERT to use the new column alias:
```sql
-- Before: v_item_record.photo_path
-- After:  v_item_record.photo_storage_path
```

**2. Database Migration -- Fix `get_public_gate_pass_status`**

Add `photo_storage_path` and `sr_number` to the items JSON output:

```sql
jsonb_build_object(
  'id', pi.id, 'sr_number', pi.sr_number,
  'item_name', pi.item_name, 'description', pi.description,
  'quantity', pi.quantity, 'unit', pi.unit,
  'photo_storage_path', pi.photo_storage_path
)
```

**3. Frontend -- `PublicStatusPage.tsx`**

Update the items rendering to construct `photo_url` from `photo_storage_path` using the storage public URL pattern:
```
{SUPABASE_URL}/storage/v1/object/public/public-gate-pass-photos/{photo_storage_path}
```

The frontend already checks `item.photo_url` (line 414) -- we just need to compute it from the storage path returned by the RPC.

### Changes Summary

| File / Target | Change |
|---|---|
| Database migration | Fix `submit_public_gate_pass` -- change `photo_path` to `photo_storage_path` in `jsonb_to_recordset` |
| Database migration | Fix `get_public_gate_pass_status` -- add `photo_storage_path` and `sr_number` to items JSON |
| `src/pages/public-gate-pass/PublicStatusPage.tsx` | Compute `photo_url` from `photo_storage_path` + Supabase storage URL |

### Note on Existing Data

Previously submitted items have `photo_storage_path = NULL` due to Bug 1. Those historical records cannot show photos retroactively. New submissions after this fix will correctly save and display item photos.

