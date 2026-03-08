

## Plan: Localize Security Dashboard trendValue strings

### Problem
4 hardcoded English template literals in `SecurityDashboard.tsx` KPI trendValues (lines 75, 83, 91, 105) that don't translate to Arabic.

### Changes

#### 1. `src/locales/en/translation.json` (line ~1886)
Add 3 new keys to the existing `security.dashboard` block:
- `"ofTracked": "of {{count}} tracked"`
- `"onSiteCount": "{{count}} on site"`
- `"patrolsCompletedCount": "{{count}} completed"`

Note: `ofTotal` already exists at line 1886.

#### 2. `src/locales/ar/translation.json` (line ~9062)
Add matching Arabic keys to `security.dashboard`:
- `"ofTotal": "من {{total}} إجمالي"`
- `"ofTracked": "من {{count}} متتبع"`
- `"onSiteCount": "{{count}} في الموقع"`
- `"patrolsCompletedCount": "{{count}} مكتملة"`

#### 3. `src/pages/security/SecurityDashboard.tsx`
Replace 4 hardcoded trendValue strings:

| Line | Before | After |
|------|--------|-------|
| 75 | `` `of ${stats.totalGuards} total` `` | `t('security.dashboard.ofTotal', { total: stats.totalGuards })` |
| 83 | `` `of ${guardLocations.length} tracked` `` | `t('security.dashboard.ofTracked', { count: guardLocations.length })` |
| 91 | `` `${stats.visitorsOnSite} on site` `` | `t('security.dashboard.onSiteCount', { count: stats.visitorsOnSite })` |
| 105 | `` `${stats?.patrolsCompleted ?? 0} completed` `` | `t('security.dashboard.patrolsCompletedCount', { count: stats?.patrolsCompleted ?? 0 })` |

No other changes needed — all other strings in the component already use `t()` calls.

