

# Fix: "Failed to save part result" Error

## Root Cause

The `asset_inspection_part_results` table has a **foreign key constraint** on `inspection_id` that references the `asset_inspections` table. However, the code in `QuickInspectionCard.tsx` (line 193) passes `sessionAsset.id` — which is an ID from the `inspection_session_assets` table, not `asset_inspections`. This FK violation causes the database to reject every part result save.

```text
QuickInspectionCard.tsx
  └─ inspectionId={sessionAsset.id}    ← ID from inspection_session_assets
       │
       ▼
AssetPartInspectionCard
  └─ useSavePartInspectionResult()
       └─ INSERT into asset_inspection_part_results
            └─ inspection_id = sessionAsset.id   ← FK expects asset_inspections.id
                                                    ← CONSTRAINT VIOLATION ✗
```

## Fix Plan

### Step 1: Change the FK target (database migration)

Alter the `asset_inspection_part_results.inspection_id` foreign key to reference `inspection_session_assets(id)` instead of `asset_inspections(id)`. The session-based inspection flow stores all per-asset data in `inspection_session_assets`, so this is the correct parent table.

```sql
ALTER TABLE public.asset_inspection_part_results
  DROP CONSTRAINT asset_inspection_part_results_inspection_id_fkey;

ALTER TABLE public.asset_inspection_part_results
  ADD CONSTRAINT asset_inspection_part_results_inspection_id_fkey
  FOREIGN KEY (inspection_id)
  REFERENCES public.inspection_session_assets(id)
  ON DELETE CASCADE;
```

### Step 2: Add `.throwOnError()` to the upsert call

In `src/hooks/use-part-inspection-results.ts`, add `.throwOnError()` after `.single()` in `useSavePartInspectionResult` to prevent silent failures (per project memory on forced RLS error reporting).

### Step 3: Update `useSessionPartsProgress` query

The hook in `use-session-parts-progress.ts` already queries part results using `inspection_session_assets` IDs via `.in('inspection_id', saIds)` — this is correct and will work once the FK is fixed.

## Files Modified

| File | Change |
|------|--------|
| Database migration | Repoint FK from `asset_inspections` to `inspection_session_assets` |
| `src/hooks/use-part-inspection-results.ts` | Add `.throwOnError()` to upsert chain |

