

## Fix: Public Gate Pass Items and Photos Not Showing in Detail Dialog

### Root Cause

Public gate passes store their items and photos in a **different table** than internal ones:

- Internal passes: items in `gate_pass_items`, photos in `gate_pass_item_photos` / `gate_pass_photos`
- Public passes: items in `public_gate_pass_items` (with `photo_storage_path` embedded in each item row)

The `useGatePassItems` hook only queries `gate_pass_items`, so it returns zero rows for public passes. Similarly, `useGatePassPhotos` queries `gate_pass_item_photos` and `gate_pass_photos`, which are also empty for public passes.

The public tracking page works because it uses the `get_public_gate_pass_status` RPC, which correctly reads from `public_gate_pass_items`.

### Database Evidence

```
public_gate_pass_items for PUB-20260210-62c1e933:
- "Dicta elit inventor" with photo: temp-1770762086550-x64edp/1-1770762086550.jpg
- "hjkhkhgkj" with photo: temp-1770762086550-x64edp/2-1770762089328.jpg
```

### Fix (1 file)

**File:** `src/hooks/contractor-management/use-gate-pass-details.ts`

**Change 1 -- `useGatePassItems`:** When the pass is public, query `public_gate_pass_items` instead of `gate_pass_items`. Add an `isPublic` parameter (similar to the existing `useGatePassPhotos` which already accepts this flag).

```typescript
export function useGatePassItems(passId: string | null, isPublic: boolean = false) {
  // ...
  if (isPublic) {
    // Query public_gate_pass_items for public submissions
    const { data, error } = await supabase
      .from("public_gate_pass_items")
      .select("id, gate_pass_id, item_name, description, quantity, unit, sr_number, photo_storage_path, created_at")
      .eq("gate_pass_id", passId)
      .is("deleted_at", null)
      .order("sort_order", { ascending: true });
    // ...
  } else {
    // existing gate_pass_items query
  }
}
```

**Change 2 -- `useGatePassPhotos`:** When the pass is public, build photo entries from the `photo_storage_path` column in `public_gate_pass_items` (since public passes embed photos directly in the items table). Generate signed URLs from the `public-gate-pass-photos` bucket.

```typescript
if (isPublic) {
  // Fetch items with photos from public_gate_pass_items
  const { data: publicItems } = await supabase
    .from("public_gate_pass_items")
    .select("id, gate_pass_id, photo_storage_path, item_name, created_at")
    .eq("gate_pass_id", passId)
    .not("photo_storage_path", "is", null)
    .is("deleted_at", null);

  // Convert each item's photo_storage_path into a GatePassPhoto entry
  // Generate signed URLs from 'public-gate-pass-photos' bucket
}
```

**Change 3 -- Caller update in `GatePassDetailDialog.tsx`:** Pass `isPublic` to `useGatePassItems`:

```typescript
const { data: items, isLoading: isLoadingItems } = useGatePassItems(
  open ? pass?.id || null : null,
  pass?.is_public_request || false  // ADD isPublic flag
);
```

### Technical Details

| # | File | Change |
|---|------|--------|
| 1 | `src/hooks/contractor-management/use-gate-pass-details.ts` | Add `isPublic` param to `useGatePassItems`; query `public_gate_pass_items` when true |
| 2 | `src/hooks/contractor-management/use-gate-pass-details.ts` | Update `useGatePassPhotos` to extract photos from `public_gate_pass_items.photo_storage_path` when public |
| 3 | `src/components/contractors/GatePassDetailDialog.tsx` | Pass `isPublic` flag to `useGatePassItems` call |

### Risk
- Low -- additive changes with no schema modifications
- Internal gate passes are unaffected (the `isPublic=false` default preserves existing behavior)
- The `GatePassItem` type may need extending to include `sr_number` and `photo_storage_path` fields for public items

