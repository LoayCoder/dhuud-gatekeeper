

# Backfill All Part Results for Session INS-2026-0004

## Current State
- **Session:** `INS-2026-0004` (id: `f36b5d1b-...`), status: `in_progress`, 58 assets, all inspected
- **Parts per asset:** 6 parts (subtype `206d07fa...` — fire extinguisher parts)
- **Expected total:** 58 × 6 = **348 part results**
- **Currently exists:** 58 results (9 assets fully done, 4 assets with 1/6, 45 assets with 0/6)

## What Needs to Happen
Insert **290 missing part result rows** into `asset_inspection_part_results`:
- **45 assets × 6 parts** = 270 new rows (assets with zero results)
- **4 assets × 5 parts** = 20 new rows (assets missing 5 of 6 parts)

All inserted with `result = 'pass'`, tenant_id `e30ae1a5-...`, responded_by the inspector `9e5ae1f2-...`.

## The 6 Part IDs
1. `51dcadc3-...` — Agent Rating / Certification
2. `d254dd8d-...` — Discharge Mechanism
3. `6cfdf5db-...` — Cooling Capability
4. `6e19a4a0-...` — Cylinder Body Integrity
5. `531820a1-...` — Service / Inspection Label
6. `fb96b6f2-...` — Mounting / Stand Secure

## Execution
A single SQL INSERT using a cross join of session asset IDs × part IDs, excluding combinations that already exist. This will be run via the database insert tool.

## Technical Detail

```sql
INSERT INTO asset_inspection_part_results (inspection_id, part_id, tenant_id, result, responded_by, responded_at)
SELECT sa.id, p.id, 'e30ae1a5-7eab-4776-bd0b-bb0b391e68e8', 'pass', '9e5ae1f2-c51d-4afd-9386-b45d06c13a61', now()
FROM inspection_session_assets sa
CROSS JOIN asset_type_parts p
WHERE sa.session_id = 'f36b5d1b-2f64-4000-b931-af7157afaee6'
  AND p.subtype_id = '206d07fa-f557-4954-a79c-7d751ea9cf64'
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM asset_inspection_part_results pr
    WHERE pr.inspection_id = sa.id AND pr.part_id = p.id AND pr.deleted_at IS NULL
  );
```

This inserts exactly the 290 missing rows without duplicating existing ones.

