

# Plan: Add Missing Translations for Urdu, Hindi, and Filipino

## Problem
The English source file has ~9,876 lines while Urdu (~6,541), Hindi (~6,526), and Filipino (~6,518) each have ~3,300+ lines of missing keys. These missing keys cause fallback to English or auto-generated labels at runtime.

## Approach
Create a Node.js script (similar to `scripts/i18n-audit-fix.cjs` used for Arabic) that:

1. **Parses** `en/translation.json` using the dedup parser (handles duplicate keys)
2. **For each target language** (ur, hi, fil):
   - Deep-walks all EN keys
   - Identifies missing keys not present in the target file
   - Translates using a built-in HSSE dictionary (~300+ terms per language)
   - Preserves `{{variable}}` placeholders and HTML tags
   - Does NOT overwrite existing translations
   - Writes the merged result back
3. **Processes one language at a time** (ur → hi → fil)
4. **Generates a report** of keys added per language and any keys that need manual review

## File Changes

### 1. Create `scripts/i18n-translate-remaining.cjs`
- Reuses the `parseJsonDedup` logic from the Arabic script
- Contains translation dictionaries for:
  - **Urdu** (formal, RTL) — HSSE terms like "Incident" → "واقعہ", "Risk Assessment" → "خطرے کی تشخیص"
  - **Hindi** (formal) — "Incident" → "घटना", "Risk Assessment" → "जोखिम मूल्यांकन"
  - **Filipino** (formal) — "Incident" → "Insidente", "Risk Assessment" → "Pagsusuri ng Panganib"
- Word-by-word dictionary translation for simple values
- Copies EN value as-is for complex/long strings (flagged for manual review)
- Outputs summary: `X keys added, Y keys need manual review`

### 2. Update `src/i18n.ts`
- Change ur, hi, fil imports to use `?raw` + `parseJsonDedup` (same pattern as en/ar) to handle any duplicate keys in those files too

### 3. Update `src/locales/ur/translation.json`
- All missing keys from EN added with Urdu translations

### 4. Update `src/locales/hi/translation.json`  
- All missing keys from EN added with Hindi translations

### 5. Update `src/locales/fil/translation.json`
- All missing keys from EN added with Filipino translations

## Technical Notes
- The script uses dictionary-based translation for common UI/HSSE terms and copies English for domain-specific long sentences (flagged for human review)
- Placeholder integrity (`{{variable}}`) is preserved by regex extraction and reinsertion
- Existing translations are never overwritten — only missing keys are added
- The `?raw` import pattern in i18n.ts ensures duplicate keys in any language file are safely deep-merged at runtime

## Execution Order
1. Create the script
2. Update i18n.ts imports for ur/hi/fil to use raw+dedup
3. The script would need to be run locally: `node scripts/i18n-translate-remaining.cjs`
4. Verify build passes

