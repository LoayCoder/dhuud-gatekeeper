

# Reuse ActionListTable for Matching Assets Panel

## Idea

The `ActionListTable` component already has everything needed: search, pagination, expandable detail rows, mobile card layout, and RTL support. Instead of building custom responsive logic in `TemplateItemBuilder`, reuse `ActionListTable` directly.

## Changes

### `TemplateItemBuilder.tsx`

Replace the custom asset list with `ActionListTable`, defining columns like:

| Column | Primary? | Expandable? | Content |
|--------|----------|-------------|---------|
| Asset (code + name) | ✅ | — | Badge + name |
| Type / Subtype | — | — | `Type / Subtype` |
| Zone | — | ✅ | MapPin icon + zone name |
| Building | — | ✅ | Building name |

This gives us for free:
- **Mobile cards** with expand/collapse "More details" / "Less details" toggle (exactly like the Pending Approvals screenshot)
- **Search** across asset code, name, type, subtype
- **Pagination** when there are many assets
- **Desktop table** with sortable columns
- Removes the custom `useState` expand logic and `ScrollArea`

### Column definitions (sketch)

```tsx
const columns: ActionListColumn<AssetRow>[] = [
  {
    key: 'name',
    label: t('common.asset'),
    primary: true,
    sortable: true,
    render: (item) => (
      <div className="flex flex-col gap-0.5">
        <span className="font-medium text-sm">{item.name}</span>
        <Badge variant="outline" className="text-[10px] w-fit">{item.asset_code}</Badge>
      </div>
    ),
  },
  {
    key: 'type_name',
    label: t('assets.type'),
    sortable: true,
    render: (item) => (
      <span className="text-xs text-muted-foreground">
        {item.type_name}{item.subtype_name ? ` / ${item.subtype_name}` : ''}
      </span>
    ),
  },
  {
    key: 'zone_name',
    label: t('common.zone'),
    expandable: true,
    render: (item) => item.zone_name ? (
      <span className="inline-flex items-center gap-1 text-xs">
        <MapPin className="h-3 w-3" /> {item.zone_name}
      </span>
    ) : '—',
  },
  {
    key: 'building_name',
    label: t('common.building'),
    expandable: true,
    render: (item) => item.building_name || '—',
  },
];
```

### Data mapping

Flatten the nested asset objects into a flat `Record<string, unknown>` so `ActionListTable` can search/sort:

```tsx
const rows = assets.map(a => ({
  id: a.id,
  name: a.name,
  asset_code: a.asset_code,
  type_name: a.type?.name ?? '',
  subtype_name: a.subtype?.name ?? '',
  zone_name: a.floor_zone?.name ?? '',
  building_name: a.building?.name ?? '',
}));
```

## Files Modified

- **`TemplateItemBuilder.tsx`** — Replace custom list with `ActionListTable`, define columns, flatten data

## Result

The matching assets panel will look and behave identically to the Pending Approvals sheet on mobile (expandable cards, search, pagination) with zero custom responsive code.

