

# Fix: Missing `teamPerformance` Translation Namespace in Arabic

## Problem
In `src/locales/ar/translation.json` line 6561, `teamPerformance` is a flat string (`"أداء الفريق"`). The English file has it as a nested object with ~20 keys (lines 7388–7408). Every `t('teamPerformance.title')`, `t('teamPerformance.assigneeMetrics')`, etc. falls back to English.

## Fix

### File: `src/locales/ar/translation.json`

Replace the flat string at line 6561 with the full nested object matching the EN structure (~20 keys):

- **Page header:** `title` (لوحة أداء الفريق), `subtitle`
- **Summary cards:** `totalAssignees`, `avgCompletionRate`, `avgResolutionTime`, `slaBreaches`
- **Chart:** `completionRateByAssignee`
- **Table headers:** `assigneeMetrics`, `assignee`, `department`, `totalActions`, `completed`, `overdue`, `completionRate`, `slaCompliance`, `avgResolution`
- **Department section:** `departmentMetrics`
- **Empty states:** `noData`, `noDepartmentData`

### Files Modified
1. `src/locales/ar/translation.json` — Replace flat string with nested object (~20 keys)

