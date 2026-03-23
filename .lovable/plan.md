

# Asset Management ↔ Inspection Module Integration Audit

## Integration Health: ⚠️ Partial Issues (4 bugs found)

---

## Findings Table

| # | Area | Issue | Severity | Root Cause | Impact |
|---|------|-------|----------|------------|--------|
| 1 | Navigation | `StartInspectionDialog` navigates to `/assets/inspections/${result.id}` — **no matching route** | **Critical** | Route is `assets/:id/inspections/:inspectionId` (requires both asset ID and inspection ID), but dialog only builds path with inspection ID | After starting an asset inspection, user lands on a 404/blank page |
| 2 | Navigation | `InspectionHistoryTab` "View" link uses `/assets/inspections/${inspection.id}` — **no matching route** | **Critical** | Same as above — missing asset ID segment in URL | Clicking "View" on any inspection history entry navigates to non-existent page |
| 3 | Navigation | `RecentInspectionsCard` links to `/assets/inspections/${inspection.id}` — **no matching route** | **Critical** | Same broken pattern repeated in dashboard widget | Recent inspections links are all broken |
| 4 | Data Sync | `useCompleteInspection` does NOT update `hsse_assets.last_inspection_date` after inspection completion | **Medium** | The mutation only updates `asset_inspections.status` to `completed`. The DB trigger `calculate_next_inspection_due` fires on `hsse_assets` updates, but `last_inspection_date` is never written — so `next_inspection_due` is never recalculated | Asset detail page and map show stale/incorrect "next inspection due" dates. Overdue badges become permanently inaccurate. |
| 5 | API Signature | `StartInspectionDialog` calls `useTemplatesForAsset(category_id)` with 1 arg but the real hook accepts 2 `(categoryId, typeId)` | **Low** | Stub and real hook have different signatures. `type_id` from the asset is available in the dialog props but not passed through | Template filtering ignores asset type — user may see irrelevant templates |

---

## Verified as Correct ✅

- `useAssetInspections` correctly queries `asset_inspections` by `asset_id`
- `useStartInspection` correctly inserts with `asset_id`, `tenant_id`, `inspector_id`
- `InspectionHistoryTab` correctly displays inspection history with template names, results, dates
- Asset detail page has a dedicated "Inspections" tab rendering `InspectionHistoryTab`
- `InspectionWorkspace` correctly reads `inspectionId` from params and loads inspection data
- `useCompleteInspection` invalidates both inspection and asset query caches
- DB trigger `calculate_next_inspection_due` correctly recalculates dates when `last_inspection_date` changes
- Asset map shows overdue inspection badges (via `next_inspection_due` comparison)
- Asset import correctly handles `inspection_interval_days` and `next_inspection_due`
- RLS is properly scoped via `tenant_id` on both `hsse_assets` and `asset_inspections`

---

## Fix Plan

### Fix 1 — Navigation links (Critical, 3 files)

**All three files** use the broken pattern `/assets/inspections/${id}`. The correct route is `/assets/${assetId}/inspections/${inspectionId}`.

**`StartInspectionDialog.tsx` (line 72):**
Change `navigate(\`/assets/inspections/${result.id}\`)` to `navigate(\`/assets/${asset.id}/inspections/${result.id}\`)`

**`InspectionHistoryTab.tsx` (line 109):**
Change `to={\`/assets/inspections/${inspection.id}\`}` to `to={\`/assets/${assetId}/inspections/${inspection.id}\`}`
(The `assetId` prop is already available)

**`RecentInspectionsCard.tsx` (line 68):**
Change `to={\`/assets/inspections/${inspection.id}\`}` to `to={\`/assets/${inspection.asset_id}/inspections/${inspection.id}\`}`
(Need to include `asset_id` in the query select — verify it's already fetched)

### Fix 2 — Update `last_inspection_date` on completion (Medium)

**`use-inspection-hooks.ts` — `useCompleteInspection`:**
After updating `asset_inspections`, also update `hsse_assets.last_inspection_date`:

```typescript
// After the inspection update succeeds:
const assetId = (result as any).asset?.id || result.asset_id;
if (assetId) {
  await supabase
    .from('hsse_assets')
    .update({ last_inspection_date: new Date().toISOString().split('T')[0] })
    .eq('id', assetId);
}
```

This triggers the existing DB trigger to recalculate `next_inspection_due`.

### Fix 3 — Pass `type_id` to `useTemplatesForAsset` (Low)

**`StartInspectionDialog.tsx`:**
- Add `type_id` to the `asset` prop interface
- Change `useTemplatesForAsset(asset.category_id)` to `useTemplatesForAsset(asset.category_id, asset.type_id)`

---

## Files to Modify

1. `src/features/incidents/components/inspections/StartInspectionDialog.tsx` — Fix navigate path + pass `type_id`
2. `src/features/incidents/components/inspections/InspectionHistoryTab.tsx` — Fix "View" link path
3. `src/features/incidents/components/inspections/RecentInspectionsCard.tsx` — Fix link path (verify `asset_id` in query)
4. `src/features/incidents/hooks/use-inspections/use-inspection-hooks.ts` — Update `last_inspection_date` in `useCompleteInspection`

