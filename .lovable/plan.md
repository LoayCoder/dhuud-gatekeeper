

## Plan: Add missing `security.analytics` block to Arabic translations

### Root Cause
The component `GeofenceBreachesChart.tsx` uses `t('security.analytics.geofenceBreaches')` and `t('security.analytics.breaches')`. In English, these keys exist correctly under `security.analytics` (line 1448). In Arabic, the translations exist but are under a **top-level** `analytics` block (line 4883-4886), not under `security.analytics`. So i18next can't find them and falls back to English.

### Change

**`src/locales/ar/translation.json`** — Insert a new `analytics` block after `security.dashboard` (after line 9099, before `patrols`):

```json
    "analytics": {
      "geofenceBreaches": "اختراقات السياج الجغرافي عبر الزمن",
      "breaches": "اختراقات",
      "selectRange": "اختر الفترة",
      "today": "اليوم",
      "last7Days": "آخر 7 أيام",
      "last30Days": "آخر 30 يومًا",
      "thisWeek": "هذا الأسبوع",
      "thisMonth": "هذا الشهر",
      "custom": "مخصص",
      "startDate": "البداية",
      "endDate": "النهاية"
    },
```

**`src/locales/en/translation.json`** — Add the missing date range keys to the existing `security.analytics` block (line 1448-1451):

```json
    "analytics": {
      "geofenceBreaches": "Geofence Breaches Over Time",
      "breaches": "Breaches",
      "selectRange": "Select range",
      "today": "Today",
      "last7Days": "Last 7 Days",
      "last30Days": "Last 30 Days",
      "thisWeek": "This Week",
      "thisMonth": "This Month",
      "custom": "Custom",
      "startDate": "Start",
      "endDate": "End"
    },
```

No component changes needed.

