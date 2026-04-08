

# Fix: Gate Pass Photo Upload Bugs

## Confirmed Bugs

1. **Dead code** (lines 171-203): `data.photos` upload is nested inside `if (data.plate_photos)` — general photos never upload unless plate photos exist
2. **Crash risk** (line 173): `for (const photo of data.photos)` has no null guard — crashes if `data.photos` is undefined
3. **Wrong storage path** (line 175): Missing `tenantId/` prefix — inconsistent with all other uploads and will be blocked by storage RLS
4. **Silent failures** (lines 78-96): `gate_pass_items` insert swallows errors, pushing empty string IDs, causing downstream photo uploads to be silently skipped

## Changes — Single File

**`src/features/contractors/services/materialGatePassCreateService.ts`**

### Change 1: Add `.throwOnError()` to `gate_pass_items` insert (lines 78-96)
Replace manual error handling with `.throwOnError()` so RLS violations surface immediately and stop the creation flow.

### Change 2: Add `.throwOnError()` to `gate_pass_item_photos` insert (lines 133-141)
Same treatment for consistency.

### Change 3: Move `data.photos` block outside `if (data.plate_photos)` (lines 147-203)
Close the `if (data.plate_photos)` block after line 170, then start a new `if (data.photos && data.photos.length > 0)` block for general photos.

### Change 4: Fix storage path (line 175)
Change `${result.id}/...` to `${tenantId}/${result.id}/...`.

## No Other Files Changed

The item photo loop (lines 100-143) is structurally correct. No pre-buffering needed. No race condition exists.

