

# Add QR/Barcode Scanning to Area Session Workspace (Asset Mode)

## Problem
The AreaSessionWorkspace in asset mode shows 58 fire extinguishers in an accordion, but there's no scanning option to quickly locate and open a specific asset. Users must scroll/search manually — impractical in the field.

## Solution
Add a **Scan QR** button next to the search bar that opens a scanner dialog. When an asset code is scanned, auto-expand the matching accordion item and scroll to it.

## Changes

### 1. Add Scan Button + Dialog to AreaSessionWorkspace
**File:** `src/pages/inspections/AreaSessionWorkspace.tsx`

- Import `QrCode` icon, `Dialog`/`DialogContent`/`DialogHeader`/`DialogTitle`, and `AssetQRScanner` from `@/features/assets`
- Add state: `showScanner` (boolean)
- Next to the search `Input` (line ~478), add a scan button:
  ```tsx
  <Button variant="outline" size="icon" onClick={() => setShowScanner(true)}>
    <QrCode className="h-4 w-4" />
  </Button>
  ```
- Add scanner dialog that uses `AssetQRScanner` or `ScannerDialog`
- On scan success: match scanned code against `sessionAssets` by `asset.asset_code`, set the accordion value to the matching `sa.id`, and scroll it into view
- If no match found, show a toast: "Asset not found in this session"

### 2. Convert Accordion to controlled mode
**File:** `src/pages/inspections/AreaSessionWorkspace.tsx`

- Add state: `expandedAssetId` (string)
- Change `<Accordion type="single" collapsible>` to use `value={expandedAssetId}` and `onValueChange={setExpandedAssetId}`
- On scan match, set `expandedAssetId` to the matched session asset ID and use `scrollIntoView`

### 3. Add ScanFAB for mobile
**File:** `src/pages/inspections/AreaSessionWorkspace.tsx`

- Import `ScanFAB` from `@/features/assets` — but repurpose for session context (open the same scanner dialog instead of navigating away)
- Or: add a floating scan button visible on mobile (`sm:hidden`, fixed bottom-right) that opens the same scanner dialog

## Files Modified
| File | Change |
|------|--------|
| `AreaSessionWorkspace.tsx` | Add scan button, scanner dialog, controlled accordion, scroll-to-asset on scan, mobile FAB |

## No Schema Changes

