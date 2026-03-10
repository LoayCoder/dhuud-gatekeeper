

# Fix: Missing `tenantManagement` Namespace in Arabic Translation

## Problem

The Arabic translation file (`src/locales/ar/translation.json`) has `"tenantManagement"` defined as a flat string (`"إدارة المستأجرين"`) on line 3360, instead of a nested object matching the English structure. This means **all** `tenantManagement.*` keys (~80 keys) resolve to nothing in Arabic -- the entire tenant management page shows English fallbacks or raw keys for Arabic users.

The English file (lines 5918-6074) has a complete nested object with sub-keys for: title, description, addTenant, editTenant, columns, fields, placeholders, descriptions, status, actions, detail, publicFeatures, security, modules, trial, statusDialog, and toast.

## Fix

### File: `src/locales/ar/translation.json`
Replace the flat string `"tenantManagement": "إدارة المستأجرين"` (line 3360) with a full nested object containing Arabic translations for all ~80 keys, matching the English structure exactly:

- **Root keys** (8): title, description, addTenant, editTenant, addDescription, editDescription, searchPlaceholder, noTenants, selectCurrency
- **columns** (6): name, slug, users, industry, location, contact
- **fields** (13): name, slug, industry, country, city, crNumber, vatNumber, employeeCount, contactPerson, contactEmail, contactPhone, notes, preferredCurrency, templateCodePrefix
- **placeholders** (13): matching all fields
- **descriptions** (1): templateCodePrefix
- **status** (3): active, suspended, disabled
- **actions** (5): openMenu, activate, suspend, disable, manageTenant
- **detail** (5): description, invitations, modules, trial, security, publicFeatures
- **publicFeatures.gatePass** (15): title, description, enabled, disabled, publicUrl, copyUrl, urlCopied, customDomain, customDomainDesc, customDomainPlaceholder, domainSaved, instructions, instructionsDesc, instructionsEn, instructionsAr, placeholderEn, placeholderAr, updated, updatedDesc, toggleUpdated, toggleEnabled, toggleDisabled
- **security** (7): mfaTrustDuration, mfaTrustDurationDesc, trustDurationLabel, trustDurationHelp, currentSetting, invalidDuration, updated, updatedDesc, overview, overviewDesc
- **modules** (5): description, updated, updatedDesc, override, fromPlan, required
- **trial** (17): all trial/subscription keys
- **statusDialog** (6): activate/suspend/disable title, description, warnings
- **toast** (6): created, createdDescription, updated, updatedDescription, statusUpdated, statusUpdatedDescription

### Files Modified
1. `src/locales/ar/translation.json` — Replace flat string with full ~80-key nested object

