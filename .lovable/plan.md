
# Enrich Matching Assets — Professional Card Layout

## Current State
The primary column shows `shortName + asset_code` inline. The expandable section only has Zone and Building. The query doesn't fetch category, status, last_inspection_date, or next_inspection_due.

## Changes

### 1. Expand the query (`use-inspection-template-hooks.ts`)

Add to the select string:
- `status`
- `last_inspection_date`
- `next_inspection_due`
- `category:asset_categories(name, name_ar)`
- `location_details`

### 2. Restructure columns (`TemplateItemBuilder.tsx`)

**Primary column** — clean title + asset ID:
```text
Fire Extinguisher – Lobby (ABC Dry Powder)
Asset ID: FE-2026-0063
```
- Parse the `name` field: strip category prefix (before " - "), show the rest
- If `subtype` exists, append it in parentheses
- If `floor_zone` exists, append `– {zone}` 
- Show `asset_code` on a second line as `Asset ID: {code}`

**Visible columns** (always shown):
| Column | Content |
|--------|---------|
| Asset (primary) | Formatted name + Asset ID |
| Status | Badge with color |

**Expandable columns** (in "More details"):
| Column | Content |
|--------|---------|
| Category | `category.name` |
| Asset Type | `type / subtype` |
| Building | `building.name` |
| Floor/Zone | `floor_zone.name` |
| Last Inspection | Formatted date or "—" |
| Next Due | Formatted date or "—" |

### 3. Data mapping

Flatten to `AssetRow` with new fields:
```ts
interface AssetRow extends Record<string, unknown> {
  id: string;
  name: string;           // full name
  display_name: string;   // parsed: "Fire Extinguisher – Lobby (ABC Dry Powder)"
  asset_code: string;
  category_name: string;
  type_name: string;
  subtype_name: string;
  zone_name: string;
  building_name: string;
  status: string;
  last_inspection: string;
  next_due: string;
}
```

Name parsing logic:
```ts
const parts = a.name.split(' - ');
const baseName = parts.length > 1 ? parts.slice(1).join(' - ') : a.name;
const subtypeLabel = a.subtype?.name ? ` (${a.subtype.name})` : '';
const zoneLabel = a.floor_zone?.name ? ` – ${a.floor_zone.name}` : '';
const displayName = `${baseName}${zoneLabel}${subtypeLabel}`;
```

### 4. Status badge colors

Map asset status to badge variants:
- `active` → green/success outline
- `under_maintenance` → yellow/warning
- `out_of_service` → red/destructive
- Others → default muted

## Files Modified
- `use-inspection-template-hooks.ts` — add category, status, dates to select
- `TemplateItemBuilder.tsx` — new column definitions, richer primary column, 6 expandable detail fields
