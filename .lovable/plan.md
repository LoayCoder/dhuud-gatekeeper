

# Asset ↔ Inspection Template Integration Gaps

## Current Column Comparison

```text
Field              hsse_assets          inspection_templates
─────────────────  ───────────────────  ────────────────────
tenant_id          ✅ uuid (NOT NULL)    ✅ uuid (NOT NULL)
category_id        ✅ uuid (NOT NULL)    ✅ uuid (nullable)
type_id            ✅ uuid (NOT NULL)    ✅ uuid (nullable)
subtype_id         ✅ uuid (nullable)    ❌ MISSING
branch_id          ✅ uuid (nullable)    ✅ uuid (nullable)
site_id            ✅ uuid (nullable)    ✅ uuid (nullable)
building_id        ✅ uuid (nullable)    ❌ MISSING
floor_zone_id      ✅ uuid (nullable)    — (not relevant)
```

**Two columns exist on assets but are missing from inspection_templates:** `building_id` and `subtype_id`. This means templates cannot be scoped to a specific building or asset subtype.

## Template Matching Logic — Broken

The `useTemplatesForAsset` hook currently:
- Only filters by `category_id` (loosely)
- Completely ignores `type_id`, `branch_id`, `site_id`
- Does not filter by `template_type = 'asset'`

This means **all active templates show up** regardless of whether they match the asset's location or classification — and non-asset templates (area/audit) also appear.

## Plan

### 1. Database Migration — Add `building_id` and `subtype_id` to `inspection_templates`

```sql
ALTER TABLE public.inspection_templates
  ADD COLUMN building_id uuid REFERENCES public.buildings(id) ON DELETE SET NULL,
  ADD COLUMN subtype_id uuid REFERENCES public.asset_subtypes(id) ON DELETE SET NULL;
```

### 2. Update TypeScript Types

In `types.ts`, add `building_id`, `subtype_id` to `InspectionTemplate` interface. Add `building` and `subtype` join types.

### 3. Update SELECT Queries

Both `useInspectionTemplates` and `useInspectionTemplate` — add `building_id, subtype_id` to select, plus joins:
```
building:buildings(name, name_ar),
subtype:asset_subtypes(name, name_ar)
```

### 4. Fix `useTemplatesForAsset` — Proper Hierarchical Matching

Replace the current broken filter with a proper match that accepts the full asset context and filters correctly:

```typescript
useTemplatesForAsset({
  categoryId, typeId, subtypeId,
  branchId, siteId, buildingId
})
```

Matching logic: for each field, template value must be NULL (universal) OR equal to the asset's value. Always filter `template_type = 'asset'`.

### 5. Update Template Form

In `InspectionTemplateForm.tsx`:
- Add **Building** dropdown (filtered by selected site)
- Add **Subtype** dropdown (filtered by selected type, asset templates only)
- Cascade resets: Branch change clears Site→Building; Category change clears Type→Subtype
- Include both fields in create/update mutations

### 6. Update `StartInspectionDialog`

Pass full asset context (branch_id, site_id, building_id, subtype_id) to `useTemplatesForAsset` so only relevant templates appear.

### Files Modified
- `inspection_templates` table (migration)
- `src/features/incidents/hooks/use-inspections/types.ts`
- `src/features/incidents/hooks/use-inspections/use-inspection-template-hooks.ts`
- `src/features/incidents/components/inspections/InspectionTemplateForm.tsx`
- `src/features/incidents/components/inspections/StartInspectionDialog.tsx`

