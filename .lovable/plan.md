

## Fix: Missing `actionCenter` Translation Namespace

### Problem
The entire `actionCenter` namespace is missing from **both** EN and AR translation files. All ~80 keys used across `ActionCenter.tsx`, `ActionCenterStatsBar.tsx`, `NotificationPipelineStatus.tsx`, and all 9 module components (`IncidentsModule`, `ObservationsModule`, `GatePassesModule`, etc.) fall back to hardcoded English strings, meaning Arabic users see English text.

### Fix
Add the full `actionCenter` object to both `src/locales/en/translation.json` and `src/locales/ar/translation.json`. The namespace covers:

1. **Page-level** (~6 keys): title, description, overview, overviewDesc
2. **Sections** (~12 keys): operations, accessControl, compliance, workforce, administration (+ descriptions)
3. **KPIs** (~15 keys): overdue, pending, inProgress, completed, total, active, scheduled, etc.
4. **Stats bar** (~4 keys): overdue, pendingApprovals, inProgress, totalActions
5. **Actions** (~40 keys): reportIncident, viewAll, myActions, startInspection, createGatePass, registerContractor, etc.
6. **Modules** (~18 keys): title + description for each of the 9 modules (incidents, observations, gatePasses, inspections, audits, contractors, videoInduction, users, passwordReset)
7. **Pipeline** (~4 keys): sent, pending, failed, title

### Files Modified
1. **`src/locales/en/translation.json`** — Add `actionCenter` object (~100 keys)
2. **`src/locales/ar/translation.json`** — Add `actionCenter` object (~100 keys, Arabic translations)

