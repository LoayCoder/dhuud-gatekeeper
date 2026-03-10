

# Fix: `platformSettings` Translation — Flat String in Arabic + Missing Keys in English

## Problem

Two issues:

1. **Arabic**: `platformSettings` at line 9116 is a flat string (`"إعدادات المنصة"`) instead of a nested object. All `t('platformSettings.*')` calls fall back to English defaults.

2. **English**: The namespace only has 12 keys but the component uses ~25. Missing keys (working only via inline fallbacks):
   - `developerTools`, `developerToolsDescription`
   - `seedTestData`, `seedTestDataDescription`, `seedButton`, `seedResults`
   - `seedSuccess`, `seedPartial`, `seedError`
   - `seedingInProgress`, `seedComplete`, `seedingDescription`, `seedCompleteDescription`
   - `cleanupTestData`, `cleanupTestDataDescription`, `cleanupButton`
   - `cleanupConfirmTitle`, `cleanupConfirmDescription`, `confirmCleanup`
   - `cleanupResults`, `totalDeleted`
   - `cleanupSuccess`, `cleanupError`

## Fix

### Files Modified

1. **`src/locales/en/translation.json`** — Add ~20 missing keys to the existing `platformSettings` object
2. **`src/locales/ar/translation.json`** — Replace flat string with full nested object (~32 keys with Arabic translations)

No component changes needed.

