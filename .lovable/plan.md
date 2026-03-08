

## Plan: Add i18n for `/admin/investigation-sla` page

### Problem
The `InvestigationSLASettings.tsx` page uses ~12 `sla.*` translation keys that are **all missing** from both EN and AR locale files. Additionally, the table cells contain hardcoded English strings like `"d before"`, `"+Xd"`, and `"—"`.

### Missing Keys (from the component's `t()` calls)

| Key | English Default |
|-----|----------------|
| `sla.investigationSlaSettings` | "Investigation SLA Settings" |
| `sla.investigationSlaDescription` | "Configure target completion dates and escalation thresholds for investigations based on incident severity" |
| `sla.severityConfigs` | "Severity Level Configurations" |
| `sla.severityConfigsDesc` | "Each severity level has different SLA thresholds. Higher severity incidents require faster resolution." |
| `sla.severityLevel` | "Severity" |
| `sla.warningBefore` | "Warning" |
| `sla.escalateAfter` | "L1 Escalation" |
| `sla.secondEscalation` | "L2 Escalation" |
| `sla.editConfig` | "Edit SLA Configuration" |
| `sla.editConfigDesc` | "Update the SLA thresholds for this severity level" |
| `sla.secondEscalationDays` | "L2 Escalation Days" |
| `sla.secondEscalationDesc` | "Leave as 0 to disable second escalation" |

### Hardcoded strings in table cells (lines 124, 127, 130)
- `{config.warning_days_before}d before` → needs `t()` wrapping
- `+{config.escalation_days_after}d` → needs `t()` wrapping  
- `—` (em dash for no value) → fine as-is (non-linguistic)

### Changes

#### 1. `src/locales/en/translation.json`
Add all 12 missing `sla.*` keys to the existing `sla` block.

#### 2. `src/locales/ar/translation.json`
Add matching Arabic translations for all 12 keys.

#### 3. `src/pages/admin/InvestigationSLASettings.tsx`
- Wrap hardcoded `"d before"` (line 124) with `t('sla.daysBefore', '{{days}}d before', { days: config.warning_days_before })`
- Wrap hardcoded `"+Xd"` (line 127) with `t('sla.daysAfterPlus', '+{{days}}d', { days: config.escalation_days_after })`
- Same for second escalation (line 130)
- This page does **not** use `SLAPageLayout` — it has its own standalone layout. No layout changes needed.

