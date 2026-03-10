

# Fix: Missing `executiveReport` Translation Namespace in Arabic

## Problem
In `src/locales/ar/translation.json` line 6582, `executiveReport` is a flat string (`"التقرير التنفيذي"`). The English file has it as a nested object with ~45 keys including a nested `ai` sub-object (~25 keys). Every `t('executiveReport.title')`, `t('executiveReport.ai.maturityScore')`, etc. falls back to English.

## Fix

### File: `src/locales/ar/translation.json`

Replace the flat string at line 6582 with the full nested object matching the EN structure (~45 keys):

**Top-level keys (~20):**
- `title` (تقرير الملخص التنفيذي), `subtitle`, `reportTitle`, `downloadPdf`, `pdfGenerated`, `pdfError`, `generatedOn`
- `totalIncidents`, `observations`, `inspectionsCompleted`, `avgCompliance`, `actionsCompleted`, `overdue`, `slaPerformance`, `breaches`
- `incidentsSummary`, `bySeverity`, `noIncidents`, `byStatus`, `avgClosureTime`
- `inspectionsSummary`, `sessionsByType`, `findingsStatus`, `findingsRaised`, `findingsClosed`, `complianceRate`
- `actionsSummary`, `actionStatus`, `totalCreated`, `verified`, `performance`, `slaBreachRate`, `attention`, `overdueActions`, `avgResolution`, `completed`

**Nested `ai` sub-object (~25 keys):**
- `title`, `analyzing`, `regenerate`, `maturityScore`, `grade`, `componentBreakdown`
- `incidentPrevention`, `actionEffectiveness`, `kpiPerformance`, `inspectionRigor`, `observationCulture`
- `riskPosture`, nested `riskLevel` (critical/high/moderate/low), nested `trend` (improving/stable/declining)
- `kpiHealth`, `gapOfTarget`, `topPriorities`, nested `severity` (critical/high/medium/low)
- `recommendedActions`, `expectedImpact`, `executiveNarrative`
- `whatHappened`, `whyItHappened`, `whatImproved`, `whatNeedsAction`
- `monthComparison`, `metric`, `change`, `systemicIssues`, `recommendation`

### Files Modified
1. `src/locales/ar/translation.json` — Replace flat string with nested object (~45 keys + nested sub-objects)

