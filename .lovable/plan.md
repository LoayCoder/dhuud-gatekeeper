

# Fix: Missing `orgStructure` Translation Namespace in Arabic

## Problem
In `src/locales/ar/translation.json` line 2943, `orgStructure` is a flat string (`"الهيكل التنظيمي"`). The English file has it as a nested object with ~128 keys (lines 5552–5680). Every `t('orgStructure.title')`, `t('orgStructure.addBranch')`, etc. falls back to English for Arabic users — the entire `/admin/org-structure` page is untranslated.

## Fix
Replace the flat string with a full nested Arabic translation object matching the EN structure. Key groups:

- **Page chrome** (~5): title, description
- **Entity tabs** (~8): branches, divisions, departments, sections, sites, buildings, floorsZones
- **Form fields** (~25): branchName, siteName, buildingName, floorZoneName, placeholders, parent selectors
- **Validation messages** (~10): nameRequired, divisionRequired, alreadyExists variants
- **CRUD toasts** (~6): itemCreated, itemUpdated, itemRemoved, success, deleted
- **Location/GPS** (~12): latitude, longitude, useCurrentLocation, viewOnMap, coordinates, errors
- **Site management** (~20): siteLocation, drawBoundary, assignDepartment/Section, setPrimary, confirmBoundary
- **Buildings & Floors** (~18): manageBuildings, addBuilding, floorCount, zoneType, levelNumber
- **Filters** (~5): filterByBranch, allBranches, searchSites, assignToBranch

## File Modified
1. **`src/locales/ar/translation.json`** — Replace line 2943 flat string with full nested object (~128 Arabic keys)

