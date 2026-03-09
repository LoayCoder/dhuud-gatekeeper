

## Fix: Arabic `inspectionSessions` Translation

### Problem
In `src/locales/ar/translation.json` line 4509, `"inspectionSessions"` is a flat string (`"جلسات التفتيش"`), but the component expects a nested object with ~80 keys (title, description, status, reasons, weather, etc.).

### Fix
Replace line 4509 in `src/locales/ar/translation.json` with the full Arabic translation object matching the English structure (lines 4974-5118 of `en/translation.json`). All keys will be translated to Arabic.

### File Modified
- **`src/locales/ar/translation.json`** — Replace flat string with full nested object (~145 lines covering title, description, session management, status tabs, failure reasons, weather conditions, photo/notes labels, delete confirmations, area inspection fields, etc.)

