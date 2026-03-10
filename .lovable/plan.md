

# Fix: Missing `admin.ai` Translations for AI Settings Page

## Problem

The `/admin/ai-settings` page and its 3 tab components use ~45 translation keys under `admin.ai.*` that don't exist in either English or Arabic translation files. All text relies on inline fallbacks, so Arabic users see English.

## Keys Needed

**Page header (6):** title, subtitle, observationTab, observationTabShort, incidentTab, incidentTabShort, tagsTab, tagsTabShort

**Shared controls (7):** enableTranslation, targetLanguage, severityLevels, enableTagging, autoApplyTags, settingsSaved

**Observation tab (7):** observation.rewriteRules, observation.rewriteDesc, observation.classification, observation.classificationDesc, observation.tagging, observation.taggingDesc, enablePositiveNegative, observationTypes

**Incident tab (13):** incident.rewriteRules, incident.rewriteDesc, incident.classification, incident.classificationDesc, incident.injuryExtraction, incident.injuryDesc, incident.damageExtraction, incident.damageDesc, incident.tagging, incident.taggingDesc, rewriteTitle, rewriteDescription, incidentTypes, enableInjuryExtraction, autoFillInjuryCount, autoFillInjuryType, enableDamageExtraction, autoFillDamageCategory

**Tag management (16):** tags.title, tags.desc, tags.observation, tags.incident, tags.count, tags.add, tags.empty, tags.edit, tags.create, tags.formDesc, tags.name, tags.nameAr, tags.color, tags.keywords, tags.keywordsLabel, tags.keywordsHint, tags.active, tags.deleteTitle, tags.deleteDesc

## Fix

### File 1: `src/locales/en/translation.json`
Insert `"ai": { ... }` inside the `admin` object (after line 4157) with all ~45 keys organized into sub-objects: `observation`, `incident`, `tags`.

### File 2: `src/locales/ar/translation.json`
Insert the same `"ai": { ... }` structure inside the `admin` object (after line 4513) with full Arabic translations.

No component changes needed — all keys already match the `t()` calls.

