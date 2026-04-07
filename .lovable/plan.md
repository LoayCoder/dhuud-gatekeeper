

# Fix Gate Pass Approval Dialog: Missing Items, Photos, Timeline & Vehicle Details

## Problems Identified

1. **Timeline always empty** — `events={[]}` is hardcoded in the dialog; no timeline events are ever constructed from the pass's approval data
2. **Vehicle plate split fields missing** — `vehicle_plate_letters` and `vehicle_plate_numbers` are not fetched by the details query, so the split plate display for public passes doesn't work
3. **No timeline generation logic** — There's no code to build timeline events from the existing approval timestamps (created_at, pm_approved_at, security_approved_at, etc.)

The items and photos queries should work correctly for same-tenant authenticated users viewing public gate passes (RLS permits it, data exists). If they're not showing, it may be a UI rendering issue in the Items tab when photos exist but are linked to items.

## Changes

### 1. Add missing columns to details query (`gatePassQueryService.ts`)
Add `vehicle_plate_letters, vehicle_plate_numbers` to the SELECT statement in `getGatePassDetails`.

### 2. Build timeline events from pass data (`GatePassDetailDialog.tsx`)
Generate timeline events from the pass details approval timestamps:
- **Created** — `created_at`
- **Dept Manager Approved** — `pm_approved_at` + `pm_approver`
- **Security Approved** — `security_approved_at` + `security_approver`
- **Rejected** — `rejected_at` + `rejector`
- **Guard Verified** — `guard_verified_at` + `guard`
- **Entry/Exit** — `entry_time`, `exit_time`

Build an array of `TimelineEvent` objects sorted by timestamp and pass to `TimelineTab`.

### 3. Verify Items & Photos rendering for public passes
Ensure the `ItemsPhotosTab` correctly shows item-attached photos for public gate passes. The current logic filters `photos?.filter(p => p.item_id === item.id)` — this should work since the photo service sets `item_id: item.id` for public passes. Add console logging if needed for debugging.

### Files to modify
| File | Change |
|------|--------|
| `gatePassQueryService.ts` | Add `vehicle_plate_letters, vehicle_plate_numbers` to SELECT |
| `GatePassDetailDialog.tsx` | Build timeline events from passDetails data instead of `[]` |
| `types.ts` (GatePassDetailDialog) | Verify `TimelineEvent` type supports what we need |

