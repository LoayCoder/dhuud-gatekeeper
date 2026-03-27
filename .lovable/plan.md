
# Enhance Matching Assets Panel — Expandable List with Type/Subtype/Zone

## Problems
1. **"...and 51 more" is static text** — clicking it does nothing because it's just a `<p>` tag
2. **Type and Subtype not shown** — the query fetches `type` but doesn't fetch `subtype`, and the UI doesn't render either
3. **Zone not shown** — `floor_zone_id` exists on `hsse_assets` but is not queried or displayed
4. **Unprofessional layout** — flat rows with minimal info, no grouping or expand/collapse

## Changes

### 1. Update `useMatchingAssets` query (use-inspection-template-hooks.ts)

- Add `subtype:asset_subtypes(name, name_ar)` and `floor_zone:floors_zones(name)` to the select
- Remove the `limit(5)` — fetch all matching assets (paginate later if needed, but for a panel preview this is fine since we control rendering)
- Update the return type to include `subtype` and `floor_zone`

### 2. Rewrite `TemplateItemBuilder.tsx` with professional expandable UI

**Layout per asset row:**
```text
[asset_code]  Asset Name
Type / Subtype  •  Zone: Ground Floor
```

**Expand/collapse behavior:**
- Show first 5 assets by default
- "Show all (56)" button expands the full list with a scrollable container (`max-h-64 overflow-y-auto`)
- "Show less" collapses back to 5
- Use `useState<boolean>` for expanded state

**Visual improvements:**
- Each asset in a bordered card-like row with proper spacing
- Type/Subtype shown as a secondary line in `text-muted-foreground`
- Zone shown with a location pin icon if available
- Badge for asset_code stays
- RTL-safe using `ms-`/`me-`/`text-start`

### 3. Component structure

```tsx
const [expanded, setExpanded] = useState(false);
const displayed = expanded ? matchingData.assets : matchingData.assets.slice(0, 5);
const remaining = matchingData.count - 5;

// Each row:
<div className="flex items-start gap-2 p-2.5 border rounded-md">
  <Badge variant="outline">{asset.asset_code}</Badge>
  <div className="min-w-0 flex-1">
    <p className="text-sm font-medium truncate">{asset.name}</p>
    <p className="text-xs text-muted-foreground">
      {asset.type?.name} {asset.subtype?.name ? `/ ${asset.subtype.name}` : ''}
      {asset.floor_zone?.name ? ` • Zone: ${asset.floor_zone.name}` : ''}
      {asset.building?.name ? ` • ${asset.building.name}` : ''}
    </p>
  </div>
</div>

// Expand button:
<Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)}>
  {expanded ? 'Show less' : `Show all ${matchingData.count} assets`}
</Button>
```

## Files Modified
- `src/features/incidents/hooks/use-inspections/use-inspection-template-hooks.ts` — add subtype + floor_zone joins, remove limit(5)
- `src/features/incidents/components/inspections/TemplateItemBuilder.tsx` — expandable list with type/subtype/zone display
