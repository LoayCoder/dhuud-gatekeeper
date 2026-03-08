

## Plan: Add i18n for `/admin/finding-sla` page

### Problem
The Finding SLA page and its components (`FindingSLASettings.tsx`, `FindingSLACard.tsx`, `FindingSLAEditDialog.tsx`, `use-finding-sla-config.ts`) use ~20 translation keys that are completely missing from both EN and AR locale files:

**Missing `sla.findingsConfig.*` keys (page-level, 4 keys):**
- `findingsConfig.title` → "Finding SLA Settings"
- `findingsConfig.description` → "Configure SLA thresholds for inspection findings"
- `findingsConfig.infoTitle` → "How Finding SLA Works"
- `findingsConfig.infoDescription` → "SLA configurations define when warnings are sent..."

**Missing `sla.*` keys (shared by card + dialog + hook, 12 keys):**
- `configLoadError` → "Failed to load SLA configurations"
- `configUpdated` → "SLA configuration updated"
- `configUpdateError` → "Failed to update SLA configuration"
- `editFindingConfig` → "Edit Finding SLA Configuration"
- `configureThresholds` → "Configure escalation thresholds"
- `timelinePreview` → "Timeline Preview"
- `targetDaysLabel` → "Target Days to Close"
- `targetDaysHelp` → "Number of days to resolve this finding type"
- `warningDaysHelp` → "Assignee receives reminder this many days before due date"
- `escalationDaysAfter` → "First Escalation Days After Due"
- `secondEscalationDays` → "Second Escalation Days After Due"
- `fixValidationErrors` → "Please fix the validation errors above"
- `targetLabel` → "target"
- `days` → "days"
- `targetDays` → "Target"
- `warningDaysBefore` → "Warning Days Before Due"
- `escalationL1Help` → "Manager receives alert this many days after due date"
- `escalationL2Help` → "HSSE Manager receives critical alert"

**Missing `findings.classification.*` keys (top-level, used by FindingSLACard):**
- `findings.classification.critical_nc` → "Critical NC"
- `findings.classification.major_nc` → "Major NC"
- `findings.classification.minor_nc` → "Minor NC"
- `findings.classification.observation` → "Observation"

### Additional Issue: Duplicate `sla` blocks
Both EN and AR files have **two** `sla` top-level objects (the `parseJsonDedup` merger handles this at runtime, but the second block overwrites `classification` with level-based keys instead of NC-based ones). The second block's `classification` object has `level1-5` instead of `criticalNc/majorNc/minorNc/observation` — need to merge properly.

### Changes

#### 1. `src/locales/en/translation.json`
- Add all missing Finding SLA keys to the **first** `sla` block (around line 10794): `findingsConfig.*`, `configLoadError`, `configUpdated`, `configUpdateError`, `editFindingConfig`, `configureThresholds`, `timelinePreview`, `targetDaysLabel`, `targetDaysHelp`, `warningDaysBefore`, `warningDaysHelp`, `escalationDaysAfter`, `escalationL1Help`, `secondEscalationDays`, `escalationL2Help`, `fixValidationErrors`, `targetLabel`, `days`, `targetDays`
- Add a new top-level `findings` object with `classification` sub-object containing `critical_nc`, `major_nc`, `minor_nc`, `observation`

#### 2. `src/locales/ar/translation.json`
- Add matching Arabic translations for all keys above

#### No component changes needed
All components already use the correct `t()` paths with inline defaults.

