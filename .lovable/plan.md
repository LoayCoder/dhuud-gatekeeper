# Fix Area Inspection Checklist Management Gaps

## Problem

Area and Audit inspection templates have **no UI to manage checklist items**. The `TemplateItemBuilder` component returns `null` for non-asset templates (line 181: `if (!showMatchingAssets) return null`). The CRUD hooks exist (`useCreateTemplateItem`, `useUpdateTemplateItem`, `useDeleteTemplateItem`) but nothing calls them. This means:

- Admins cannot add/edit/delete checklist questions for Area and Audit templates
- Starting an Area and Audit session with no items throws an error
- The template detail view shows nothing when expanded for area/audit templates

## Solution

Extend `TemplateItemBuilder` to render a **checklist item editor** for area/audit templates (and optionally for asset templates too). This editor will allow CRUD operations on `inspection_template_items`.

## Changes

### 1. Create `TemplateChecklistEditor` component

**New file: `src/features/incidents/components/inspections/TemplateChecklistEditor.tsx**`

- Displays existing checklist items in a sortable list (by `sort_order`)
- Each item shows: question, response type badge, critical/required badges, edit/delete buttons
- "Add Item" button opens an inline form or dialog using the existing `templateItemSchema`
- Form fields: question (EN), question (AR), response type (pass_fail, yes_no, rating, numeric, text), min/max values (for numeric), rating scale, is_critical, is_required, instructions (EN/AR)
- Uses `useTemplateItems(templateId)` to fetch, `useCreateTemplateItem`, `useUpdateTemplateItem`, `useDeleteTemplateItem` for mutations
- Drag-to-reorder support via sort_order updates

### 2. Update `TemplateItemBuilder` to show checklist editor for area/audit

**File: `src/features/incidents/components/inspections/TemplateItemBuilder.tsx**`

- Remove the `if (!showMatchingAssets) return null` early return (line 181)
- For `area` and `audit` template types: render `TemplateChecklistEditor`
- For `asset` type: keep existing matching assets table AND also show the checklist editor below it (asset inspections also use template items for per-part checklists)

### 3. Translation keys

**Files: `en/translation.json`, `ar/translation.json**`

Add keys for:

- `inspections.addChecklistItem` — "Add Checklist Item"
- `inspections.editChecklistItem` — "Edit Checklist Item"  
- `inspections.checklistItems` — "Checklist Items"
- `inspections.noChecklistItems` — "No checklist items. Add items to define what inspectors will check."
- `inspections.responseType` — "Response Type"
- `inspections.critical` — "Critical"
- `inspections.required` — "Required"
- `inspections.itemAdded` / `itemUpdated` / `itemDeleted` — toast messages

## Technical Details

- The `TemplateChecklistEditor` uses existing hooks from `use-inspection-template-hooks.ts` — no new database changes needed
- `useCreateTemplateItem` expects: `{ template_id, question, question_ar, response_type, min_value, max_value, rating_scale, is_critical, is_required, instructions, instructions_ar, sort_order }`
- The `templateItemSchema` in `TemplateItemBuilderSchema.ts` already validates the form
- Response types supported: `pass_fail`, `yes_no`, `rating`, `numeric`, `text`

## Files Changed

1. `src/features/incidents/components/inspections/TemplateChecklistEditor.tsx` — **new** (checklist CRUD UI)
2. `src/features/incidents/components/inspections/TemplateItemBuilder.tsx` — integrate checklist editor
3. `src/features/incidents/components/inspections/index.ts` — export new component
4. Translation files — new keys