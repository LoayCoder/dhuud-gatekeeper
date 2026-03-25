

# Auto-populate Inspection Checklist Items from Asset Type Parts

## Problem

The `asset_type_parts` table contains inspectable parts for each asset type/subtype (e.g., "Discharge Mechanism", "Cylinder Body Integrity" for Dry Powder extinguishers). There are hundreds of parts already defined. However, when an inspection template is created with a specific type/subtype, **no checklist items are generated** — the template remains empty because items must be manually added one by one.

The expected behavior: when a template targets a specific category/type/subtype, the system should pull the relevant inspectable parts from `asset_type_parts` and auto-create matching `inspection_template_items`.

## Data Flow

```text
asset_type_parts (source of truth)
  ├── type_id → matches template's type_id
  ├── subtype_id → matches template's subtype_id
  ├── name → becomes question text
  ├── default_response_type → becomes response_type
  └── is_critical → becomes is_critical

       ↓ Auto-generate on template save

inspection_template_items (checklist)
  ├── template_id
  ├── question = part.name
  ├── response_type = part.default_response_type
  ├── is_critical = part.is_critical
  └── sort_order = part.sort_order
```

## Plan

### 1. Add "Generate from Asset Parts" button to TemplateItemBuilder

When a template has `template_type = 'asset'` and a `type_id` or `subtype_id`, show a button that fetches matching `asset_type_parts` and bulk-inserts them as `inspection_template_items`.

- **File**: `TemplateItemBuilder.tsx`
- Accept `templateType`, `typeId`, `subtypeId` as additional props
- Add a "Generate from Asset Parts" button (visible only for asset templates with type/subtype set)
- On click: query `asset_type_parts` where `type_id` or `subtype_id` matches, then bulk-insert as template items
- Show confirmation if items already exist (to avoid duplicates)

### 2. Create `useGenerateItemsFromParts` hook

- **File**: `use-inspection-template-hooks.ts`
- New mutation hook that:
  1. Queries `asset_type_parts` filtered by `type_id` and/or `subtype_id`
  2. Maps each part to an `inspection_template_items` insert (question = name, response_type = default_response_type, etc.)
  3. Bulk-inserts into `inspection_template_items`
  4. Invalidates the `template-items` query cache

### 3. Auto-generate on template creation (optional prompt)

- **File**: `InspectionTemplateForm.tsx`
- After a template is successfully created with a type/subtype, show a toast or prompt asking "Generate checklist from asset parts?" to streamline the workflow

### 4. Pass template metadata to TemplateItemBuilder

- **File**: `InspectionTemplates.tsx` (admin page)
- Pass `template.template_type`, `template.type_id`, `template.subtype_id` to `TemplateItemBuilder` so it can render the generate button

### Files Modified
- `src/features/incidents/hooks/use-inspections/use-inspection-template-hooks.ts` — new hook
- `src/features/incidents/components/inspections/TemplateItemBuilder.tsx` — generate button + props
- `src/pages/admin/InspectionTemplates.tsx` — pass template metadata to builder
- `src/features/incidents/components/inspections/InspectionTemplateForm.tsx` — post-create prompt

