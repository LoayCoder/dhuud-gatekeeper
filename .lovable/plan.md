

# Show Auto-Detected Branch Name and Location in Quick Observation

## Problem
When GPS auto-detects the nearest site, the Quick Observation card only shows the **site name** and distance. It does not display:
1. The **Branch Name** the detected site belongs to
2. The **GPS coordinates/location** that were captured

Users need to see this information at a glance and have the ability to change the branch/site selection.

## What Changes

### 1. Enhanced GPS Detection Display (QuickObservationCard.tsx, lines ~1025-1031)

When GPS detects a site, update the display to show:
- **Site Name** (already shown)
- **Branch Name** (new) -- pulled from `gpsDetectedSite.site.branch_name`
- **GPS Coordinates** (new) -- from the form's `latitude`/`longitude` values
- A small "Change" button to allow manual override

```text
Current display:
  [pin] Main Campus
  [badge] Within 45m

New display:
  [pin] Main Campus
  [building] Branch: RGC Branch
  [badge] Within 45m | GPS: 24.7136, 46.6753
  [button] Change Site
```

### 2. Add "Change Site" Toggle

When GPS auto-detects a site, the manual site dropdown is currently hidden (only shown when no site is detected). Add a toggle/button so users can:
- See the auto-detected branch + site + location
- Click "Change" to reveal the site dropdown and override the selection
- When they change the site, the branch name updates accordingly

### 3. Show Branch Name for Manually Selected Sites Too

When a user manually selects a site from the dropdown, show the branch name of the selected site above the dropdown (using `selectedSite?.branch_name`).

### 4. Fix Existing Bug: `site.branch?.name` Reference

The dropdown items at line 1099 reference `site.branch?.name`, but `useTenantSites` returns `branch_name` as a flat property. Fix this to use `site.branch_name` consistently.

## Technical Details

### Files Modified

1. **`src/components/incidents/QuickObservationCard.tsx`**
   - Lines ~1025-1031: Expand the GPS-detected display block to include branch name and coordinates
   - Lines ~1053-1074: Add a "Change Site" button that toggles showing the manual site dropdown even when GPS detected a site
   - Lines ~1097-1104: Fix `site.branch?.name` to `site.branch_name`
   - Add a new state variable `showManualSiteOverride` to control dropdown visibility after GPS detection
   - Show branch name for the `selectedSite` when manually chosen

2. **`src/locales/en/translation.json`**
   - Add keys: `quickObservation.detectedBranch`, `quickObservation.gpsCoordinates`, `quickObservation.changeSite`

3. **`src/locales/ar/translation.json`**
   - Add Arabic translations for the same keys

### No Database Changes Required
This is a UI-only enhancement using data already available from `useTenantSites`.

