

# Fix: KPI Targets Page Translation — Missing Keys in Both Locales

## Problem
The `/admin/kpi-targets` page and its components use ~40 translation keys that exist nowhere in the locale files. They work in English only because of inline fallback defaults in `t()` calls. Arabic shows English fallbacks for all of them.

Three groups of missing keys:

### 1. `kpiAdmin.*` — ~20 missing keys (both EN and AR)
Used across `KPITargetCard`, `KPIAuditLog`, `AddKPIDialog`, `KPITargetsManagement`, `KPIPageLayout`:
- `targets`, `auditLog`, `auditLogDescription`
- `dateTime`, `kpi`, `action`, `previousValue`, `newValue`
- `noAuditLogs`, `noAuditLogsDescription`
- `addTarget`, `addTargetDescription`, `addManually`
- `selectKPI`, `selectKPIPlaceholder`, `noAvailableKPIs`
- `warning`, `critical`, `lowerBetterHint`, `higherBetterHint`
- `targetCount`, `seedDefaults`, `noTargets`, `noTargetsDescription`
- `deleteTitle`, `deleteDescription`
- `action_created`, `action_updated`, `action_deleted`

### 2. `kpiHelp.*` — ~15 missing keys (both EN and AR)
Used in `KPIHelpDrawer.tsx`:
- `title`, `subtitle`, `overviewTitle`, `overviewContent`
- `thresholdsTitle`, `thresholdsContent`, `comparisonTitle`, `comparisonContent`
- `bestPracticesTitle`, `bestPracticesContent`
- `faqTitle`, `faq1q`, `faq1a`, `faq2q`, `faq2a`, `faq3q`, `faq3a`

### 3. `kpi.status.*` — 4 missing keys (both EN and AR)
Used in `KPIEvaluationPanel.tsx`:
- `exceeding`, `onTrack`, `atRisk`, `failing`

## Fix

### Files Modified
1. **`src/locales/en/translation.json`** — Add ~40 missing keys across `kpiAdmin`, `kpiHelp`, and `kpi.status` namespaces
2. **`src/locales/ar/translation.json`** — Add matching ~40 Arabic translations

No component changes needed — all components already use proper `t()` calls with the correct key paths. We just need to add the missing keys to both locale files.

