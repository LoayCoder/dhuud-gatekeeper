

## Plan: Add i18n for `/admin/action-sla` page

### Problem
The `adminActions` top-level namespace is **entirely missing** from both EN and AR locale files. All keys used by `ActionSLASettings.tsx` and `SLAConfigEditDialog.tsx` with prefix `adminActions.*` fall back to hardcoded defaults. Additionally, 3 `sla.*` keys used by `SLAPriorityCard.tsx` are missing.

### Missing Keys

**`adminActions` namespace (new, ~15 keys):**

| Key | Default | Source |
|-----|---------|--------|
| `slaConfigDescription` | "Configure warning and escalation thresholds per priority level" | ActionSLASettings |
| `slaConfiguration` | "Configuration by Priority" | ActionSLASettings |
| `howSLAWorks` | "How It Works" | ActionSLASettings |
| `warningPhaseDesc` | "Assignee receives reminder before due date" | ActionSLASettings |
| `escalationL1Desc` | "Manager notified when action is overdue" | ActionSLASettings |
| `escalationL2Desc` | "HSSE Manager receives urgent notification" | ActionSLASettings |
| `slaUpdated` | "SLA configuration updated successfully" | use-action-sla-config hook |
| `slaUpdateError` | "Failed to update SLA configuration" | use-action-sla-config hook |
| `editSLAConfig` | "Edit SLA Configuration" | SLAConfigEditDialog |
| `configureThresholds` | "Configure escalation thresholds" | SLAConfigEditDialog |
| `timelinePreview` | "Timeline Preview" | SLAConfigEditDialog |
| `warningDaysBefore` | "Warning Days Before Due" | SLAConfigEditDialog |
| `warningDaysHelp` | "Assignee receives reminder this many days before due date" | SLAConfigEditDialog |
| `escalationDaysAfter` | "First Escalation Days After Due" | SLAConfigEditDialog |
| `escalationL1Help` | "Manager receives alert this many days after due date" | SLAConfigEditDialog |
| `secondEscalationDays` | "Second Escalation Days After Due" | SLAConfigEditDialog |
| `escalationL2Help` | "HSSE Manager receives critical alert" | SLAConfigEditDialog |
| `fixValidationErrors` | "Please fix the validation errors above" | SLAConfigEditDialog |

**`sla` namespace — 3 missing keys (used by SLAPriorityCard):**

| Key | Default |
|-----|---------|
| `daysBefore` | "days before" |
| `daysAfter` | "days after" |
| `activeActionsCount` | "{{count}} active" |

### Changes

#### 1. `src/locales/en/translation.json`
- Add new top-level `adminActions` object with 18 keys (after the `sla` block, before `session`)
- Add `daysBefore`, `daysAfter`, `activeActionsCount` to existing `sla` object

#### 2. `src/locales/ar/translation.json`
- Add matching `adminActions` object with Arabic translations
- Add matching 3 `sla.*` keys with Arabic translations

### No component changes needed
All components already use correct `t()` call paths with proper defaults.

