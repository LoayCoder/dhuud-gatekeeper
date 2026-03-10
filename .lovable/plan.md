

# Fix: Missing `documentSettings` Translation Namespace in Arabic

## Problem
In `src/locales/ar/translation.json` line 5925, `documentSettings` is a flat string (`"إعدادات المستندات"`). The English file has it as a nested object with ~45 keys across 5 sub-objects (`tabs`, `header`, `footer`, `watermark`, `preview`). All `t('documentSettings.*')` calls fall back to English.

## Fix

### File: `src/locales/ar/translation.json`

Replace the flat string at line 5925 with the full nested object:

**Top-level keys (~8):**
- `title`, `description`, `configuration`, `configurationHint`, `save`, `reset`, `saveSuccess`, `saveError`

**Nested `tabs` (3 keys):** `header`, `footer`, `watermark`

**Nested `header` (8 keys):** `primaryText`, `primaryTextPlaceholder`, `secondaryText`, `secondaryTextPlaceholder`, `logoPosition`, `positionLeft/Center/Right`, `showLogo`, `bgColor`, `textColor`

**Nested `footer` (5 keys):** `text`, `textPlaceholder`, `showPageNumbers`, `showDatePrinted`, `bgColor`, `textColor`

**Nested `watermark` (4 keys):** `enabled`, `text`, `textPlaceholder`, `opacity`

**Nested `preview` (~10 keys):** `title`, `description`, `sampleTitle`, `fieldLabel`, `fieldValue`, `dateLabel`, `locationLabel`, `locationValue`, `signature`, `date`, `pageNumber`, `hint`

### Files Modified
1. `src/locales/ar/translation.json` — Replace flat string with nested object (~45 keys)

