

## Plan: Fix missing Arabic translations in `security.dashboard` namespace

### Root Cause
The security dashboard sub-components reference keys like `security.dashboard.patrolTrends`, `security.dashboard.liveGuardMap`, `security.dashboard.topGuards`, etc. — but in the Arabic translation file, these keys exist under `dashboard.*` (line ~2822) instead of `security.dashboard.*` (line ~9059). The `security.dashboard` block only has ~20 keys and is missing ~15 that the sub-components need.

### Missing keys in `security.dashboard` (AR file, line 9059-9079)

From sub-components (`PatrolTrendsWidget`, `LiveGuardMapWidget`, `TopGuardsWidget`, `SecurityRealtimeIndicator`):

| Key | Arabic (from existing `dashboard.*`) |
|-----|------|
| `patrolTrends` | اتجاهات الدوريات |
| `patrols` | الدوريات |
| `completionRate` | نسبة الإنجاز |
| `completed` | مكتمل |
| `checkpointScans` | عمليات المسح |
| `completedPatrols` | الدوريات المكتملة |
| `scans` | عمليات المسح |
| `liveGuardMap` | مواقع الحراس المباشرة |
| `topGuards` | أفضل الحراس هذا الأسبوع |
| `noGuardData` | لا تتوفر بيانات أداء الحراس |
| `guard` | حارس |
| `live` | مباشر |
| `offline` | غير متصل |
| `realtimeConnected` | التحديثات المباشرة نشطة |
| `realtimeDisconnected` | انقطع الاتصال، جاري إعادة المحاولة... |
| `lastUpdate` | آخر تحديث |

Also from `LiveGuardMapWidget`: `security.guardsCount` (top-level under `security`).

Also need to check EN file for same keys under `security.dashboard`.

### Changes

#### 1. `src/locales/ar/translation.json`
Add ~16 missing keys to the `security.dashboard` block (after line 9078).

#### 2. `src/locales/en/translation.json`
Verify and add any missing keys to `security.dashboard` block (keys like `patrolTrends`, `liveGuardMap`, `topGuards`, `guard`, `noGuardData`, `live`, `offline`, `realtimeConnected`, `realtimeDisconnected`, `lastUpdate`, `patrols`, `completed`, `completionRate`, `checkpointScans`, `completedPatrols`, `scans`).

Also add `security.guardsCount` if missing in both files.

No component changes needed — the `t()` calls already use the correct `security.dashboard.*` paths.

