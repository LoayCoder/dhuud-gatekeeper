

# Fix: Remove Asset Parts from Template Items List — Show Only Real Assets

## Problem

The template items panel currently shows two things mixed together:
1. **Checklist items** (generated from `asset_type_parts`) — e.g., "Cylinder Body Integrity", "Pressure Gauge", "Discharge Mechanism"
2. **Matching Assets** panel — real assets from `hsse_assets`

The user's requirement is clear: the template items list should **only show real assets** (e.g., actual fire extinguishers), not spare parts/components. Asset parts are only relevant **during the inspection session** when inspecting each individual asset.

## What Changes

### 1. Remove "Generate from Asset Parts" button from TemplateItemBuilder

The `useGenerateItemsFromParts` hook and its trigger button insert `asset_type_parts` as checklist questions — this is the wrong behavior for the template view. Remove:
- The "Generate from Asset Parts" button (lines 198-208)
- The `canGenerateFromParts` logic (line 91)

The `useGenerateItemsFromParts` hook itself can stay in the codebase for the single-asset detailed inspection flow, but it should not appear on the template editor.

### 2. Keep and enhance the Matching Assets panel

The bottom "Matching Assets" panel (lines 282-321) is correct — it shows real assets from `hsse_assets` filtered by the template's hierarchy scope. This stays as-is and becomes the primary content users see.

### 3. Clarify the checklist items section

The top "Items" section (checklist questions) remains for **single-asset inspection checklists** — these are the detailed questions asked per asset during an inspection session. Rename the section header to make it clear these are "Inspection Checklist Questions" (used per asset), not the asset list itself.

### 4. Fix deduplication (existing task)

Also apply dedup logic to `useGenerateItemsFromParts` so if it's ever used from the single-asset flow, it won't create duplicates.

## Files Modified

- **`TemplateItemBuilder.tsx`** — Remove "Generate from Asset Parts" button from template editor UI; keep Matching Assets panel
- **`use-inspection-template-hooks.ts`** — Add deduplication to `useGenerateItemsFromParts` for when it's used elsewhere
- **`InspectionTemplates.tsx`** — No changes needed (already passes correct props)

## Technical Detail

The key separation:
```text
Template Editor (admin view)
  ├── Checklist Questions section — per-asset inspection questions (manual add only)
  └── Matching Assets section — live assets from hsse_assets (read-only preview)

Inspection Session (runtime)
  ├── Session assets — populated from hsse_assets at session start
  └── Per-asset checklist — asset_type_parts loaded when inspecting each asset
```

