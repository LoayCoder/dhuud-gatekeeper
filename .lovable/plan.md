

## Fix: Public Gate Pass Tracking Page - Items Not Displaying + Build Errors

### Problem Summary

Three distinct issues:

1. **Items show "0"**: The `get_public_gate_pass_status` RPC returns `items` as a **sibling** of `gate_pass` in the JSON response, but the UI reads `gatePass.items` (nested inside gate_pass) -- which is always `undefined`.
2. **Vehicle plate empty**: The RPC returns only `vehicle_plate` (combined), but the UI reads `vehicle_plate_letters` and `vehicle_plate_numbers` (separate fields not in the RPC response).
3. **Build error**: Duplicate `import { supabase }` on lines 26-27 of `VisitorPreRegistration.tsx`.

### Database Evidence

The data exists correctly in the database:
- 2 items in `public_gate_pass_items` with photos
- `vehicle_plate_letters = 'DDD'`, `vehicle_plate_numbers = '1765'`

But the RPC response structure is:

```text
{
  "success": true,
  "gate_pass": { id, status, requester_name, vehicle_plate, ... },  <-- NO items, NO plate_letters/numbers
  "items": [ {item_name, quantity, photo_storage_path, ...} ],      <-- items are HERE (sibling)
  "branch": { ... },
  "tenant": { ... }
}
```

### Fix Plan

#### 1. Database Migration: Update `get_public_gate_pass_status` RPC

Modify the RPC to include `items` inside the `gate_pass` object and add `vehicle_plate_letters`/`vehicle_plate_numbers`:

- Add `mgp.vehicle_plate_letters`, `mgp.vehicle_plate_numbers` to the SELECT
- Nest `v_items` inside the `gate_pass` JSON object instead of as a sibling
- Keep backward compatibility by also returning `items` at root level

#### 2. Fix `src/pages/public-gate-pass/PublicStatusPage.tsx`

- Destructure `items` from `data` alongside `gate_pass`, `branch`, `tenant`
- Use `items` (from root level) instead of `gatePass.items` for rendering
- Use `gatePass.vehicle_plate_letters`/`vehicle_plate_numbers` with fallback to splitting `gatePass.vehicle_plate`

#### 3. Fix `src/pages/visitors/VisitorPreRegistration.tsx`

- Remove the duplicate `import { supabase }` on line 27

### File Changes

| File | Change |
|------|--------|
| Database migration | Update `get_public_gate_pass_status` to include `vehicle_plate_letters`, `vehicle_plate_numbers` in gate_pass and nest items |
| `src/pages/public-gate-pass/PublicStatusPage.tsx` | Destructure `items` from root response; use for rendering; fix vehicle plate display |
| `src/pages/visitors/VisitorPreRegistration.tsx` | Remove duplicate import line 27 |

### Expected Result

- Items section shows "2" with both item cards, photos, and quantities
- Vehicle plate shows "DDD 1765" correctly
- Build succeeds without errors
- All data fields render from actual database values

