

## Problem

In `src/locales/ar/translation.json` line 8494, `"settings"` is a flat string (`"الإعدادات"`), but the component uses `t('settings.inspectionCategories.title')`, `t('settings.inspectionCategories.description')`, etc. — which requires a nested object matching the English structure (lines 9853-9992 in EN).

## Fix

Replace line 8494 in `src/locales/ar/translation.json` — change the flat string to the full Arabic translation object covering all three sub-sections:

1. **`settings.eventCategories`** — Event category management (~55 keys)
2. **`settings.inspectionCategories`** — Inspection category CRUD (~10 keys)  
3. **`settings.notificationMatrix`** — Notification rules and roles (~45 keys)

All keys will be translated to Arabic.

## File Modified

- **`src/locales/ar/translation.json`** — Replace `"settings": "الإعدادات"` with full nested object (~140 lines)

