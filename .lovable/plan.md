

# Fix Investigation Workspace Translation Issues

## Issues Found

1. **SLA display broken** — `InvestigationWorkspaceHeader.tsx` uses escaped template literals (`\${...}`) in `defaultValue` instead of i18next interpolation (`{{count}}`), rendering literal `${...}` text. Same issue in `InvestigationListView.tsx` and `IncidentDetailHeader.tsx`.

2. **Missing translation keys** — The following keys are used in code but missing from all translation files:
   - `investigation.sla.overdueBy` — SLA overdue badge
   - `investigation.sla.daysRemaining` — SLA remaining badge  
   - `investigation.sla.dueIn` — SLA due in (list view)
   - `investigation.workflow.completeWorkflowFirst` — Pending approval banner
   - `investigation.selectToStartDescription` — Empty state description

3. **Broken i18next interpolation in SLA** — The `defaultValue` strings use JS template literals instead of i18next `{{variable}}` syntax, so even fallback text displays incorrectly.

## Changes

### 1. Fix SLA interpolation in `InvestigationWorkspaceHeader.tsx`
Replace broken `defaultValue` template literals with proper i18next syntax:
```tsx
// Before
t('investigation.sla.overdueBy', { count: ..., defaultValue: `\${...}d OVERDUE` })
// After  
t('investigation.sla.overdueBy', { count: Math.abs(slaInfo.daysRemaining), defaultValue: '{{count}}d OVERDUE' })
t('investigation.sla.daysRemaining', { days: slaInfo.daysRemaining, hours: slaInfo.hoursRemaining, defaultValue: '{{days}}d {{hours}}h REMAINING' })
```

### 2. Fix SLA interpolation in `InvestigationListView.tsx` and `IncidentDetailHeader.tsx`
Same pattern fix for consistency.

### 3. Add missing keys to EN translation (`src/locales/en/translation.json`)
Add inside the `investigation` section:
```json
"sla": {
  "overdueBy": "{{count}}d OVERDUE",
  "daysRemaining": "{{days}}d {{hours}}h REMAINING",
  "dueIn": "Due in {{count}} days"
},
"selectToStartDescription": "Choose an incident from the list to view its details and start or continue the investigation process."
```
Add under `investigation.workflow`:
```json
"completeWorkflowFirst": "Complete the approval workflow above before accessing investigation tools."
```

### 4. Add missing keys to AR translation (`src/locales/ar/translation.json`)
```json
"sla": {
  "overdueBy": "متأخر {{count}} يوم",
  "daysRemaining": "{{days}} يوم {{hours}} ساعة متبقية",
  "dueIn": "مستحق خلال {{count}} يوم"
},
"selectToStartDescription": "اختر حادثاً من القائمة لعرض تفاصيله وبدء أو متابعة عملية التحقيق.",
"workflow.completeWorkflowFirst": "أكمل سير عمل الموافقة أعلاه قبل الوصول إلى أدوات التحقيق."
```

## Files Modified
1. `src/pages/incidents/InvestigationWorkspace/components/InvestigationWorkspaceHeader.tsx` — Fix SLA interpolation
2. `src/features/investigation/components/InvestigationListView.tsx` — Fix SLA interpolation
3. `src/features/incidents/components/detail/IncidentDetailHeader.tsx` — Fix SLA interpolation
4. `src/locales/en/translation.json` — Add missing keys
5. `src/locales/ar/translation.json` — Add missing keys

