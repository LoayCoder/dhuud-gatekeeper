# Internationalization (i18n) & Localization (l10n) Audit Report

## 1. Executive Summary
The system has been audited for Arabic-English bilingual support. The infrastructure using `i18next` and `tailwindcss-rtl` is robust. However, significant issues were found in the translation data files (`translation.json`), including massive duplication of keys and structural inconsistencies between English and Arabic files.

These issues have been resolved by cleaning up the JSON files, synchronizing their structure, and filling in missing Arabic translations with English fallbacks (and partially translating ~130 common terms).

## 2. Issues Found & Resolved

### A. Translation Data Integrity (Critical)
*   **Issue:** `src/locales/en/translation.json` contained duplicate top-level keys (e.g., `incidents`, `assets` appeared twice), causing `JSON.parse` to silently overwrite early definitions with later ones. This effectively "deleted" entire sections of the English translation (e.g., `incidents.wizard`).
*   **Resolution:** Merged duplicate keys deep-ly using a custom script.
*   **Issue:** `src/locales/ar/translation.json` had structural conflicts with English. For example, `investigation.evidence.upload` was a string in Arabic but an object in English. This causes crashes or `[object Object]` displays when accessing nested keys like `upload.button`.
*   **Resolution:** Synchronized Arabic structure to match English. Primitive values in conflict positions were converted to objects (preserving the structure).

### B. Missing Translations
*   **Issue:** Approximately 434 keys present in English were missing in Arabic.
*   **Resolution:** Added missing keys to Arabic file.
    *   ~130 common keys (e.g., "Alerts", "Delete", "Trash") were translated to Arabic.
    *   Remaining keys use English text as a fallback placeholder to prevent UI breakage.

### C. RTL Support
*   **Observation:** The system uses `tailwindcss-rtl` and `dir="rtl"` correctly.
*   **Verification:** inspected components usage of logical properties. `text-start`, `ms-`, `me-` usage patterns confirm RTL awareness. `RTLWrapper` component handles direction switching dynamically.

## 3. Recommendations

1.  **Translation Review:** A native Arabic speaker or professional translator should review `src/locales/ar/translation.json` to translate the remaining English placeholders (identified by identical English/Arabic values).
2.  **Pluralization:** The current implementation uses simple `{{count}}` strings. For proper Arabic grammar, adopt `i18next` v3 pluralization (zero, one, two, few, many, other).
3.  **Automated Integrity Check:** Add a pre-commit hook that runs a script similar to `check-translations.js` to ensure English and Arabic keys remain synchronized in structure and count.

## 4. Conclusion
The system now structurally supports full bilingual operation without crashing or missing keys. The foundation is solid, and immediate "missing key" bugs are resolved.
