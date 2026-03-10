

# Fix: Missing Arabic Translation Objects for `assetManagement` and `location`

## Problems Found

### 1. `assetManagement` — flat string instead of nested object
Line 7028 in `src/locales/ar/translation.json` has `"assetManagement": "إدارة الأصول"` instead of the nested object with ~30 keys that exists in the English file (lines 7627-7657). This breaks the investigation workspace's asset linking UI (LinkedAssetsCard, AssetLinkSelector, AssetIncidentHistory) for Arabic users.

### 2. `location` — flat string instead of nested object
Line 9884 in `src/locales/ar/translation.json` has `"location": "الموقع"` instead of the nested object with ~15 keys from English (lines 10428-10444). This breaks the LocationBoundaryPicker, SiteLocationPicker, and project location tabs for Arabic users.

**Note:** `tenantManagement` and `platformSettings` also have flat strings earlier in the file but already have proper nested duplicates later (handled by the deep-merge parser), so they work correctly.

## Fix

### File: `src/locales/ar/translation.json`

**Change 1:** Replace `"assetManagement": "إدارة الأصول"` (line 7028) with a nested object containing ~30 keys:
- Root keys: linkedAssets, noLinkedAssets, linkAsset, linkAssetToIncident, unlinkAsset, unlinkAssetConfirm, unlink, searchAssets, noAssetsFound, linkType, linkNotes, linkNotesPlaceholder, noIncidentHistory, noIncidentHistoryDescription
- `linkTypes` sub-object: involved, damaged, caused_by, affected
- `status` sub-object: label, active, inactive, under_maintenance, out_of_service, disposed, pending_disposal

**Change 2:** Replace `"location": "الموقع"` (line 9884) with a nested object containing ~15 keys:
- locationAndBoundary, locationTab, geofenceRadius, geofenceRadiusDescription, setMarker, drawBoundary, polygonPoints, needMorePoints, confirmBoundary, boundarySet, boundaryConfirmed, boundaryDefined, vertices, showRadiusBuffer, coordinates

All values translated to Arabic. No component changes needed.

