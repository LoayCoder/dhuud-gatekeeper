

## Plan: Fix Missing Arabic Translations for /security/access-control

### Problem Summary

Three issues on this page:

1. **Duplicate `accessControl` keys** in both EN (~line 10684 and ~line 11057) and AR (~line 10038 and ~line 11065) locale files. The second block has `accessDenied` and `notClientSiteRep` which should be merged into the first block.
2. **Missing translation keys** used by `UnifiedAccessLogTable.tsx` and `AccessControlDashboard.tsx`: `noEntries`, `onSite`, `exit`, `person`, `type`, `entryTime`, `exitTime`, `status` (string for table header), `recordExit`, `gateDashboard`, `entryRecorded/entryFailed/exitRecorded/exitFailed`, `entityTypes.contractor/employee/vehicle`, and `validationStatus.valid/warning/denied` (used in `getStatusBadge` function).
3. **Hardcoded English mobile tab labels** on lines 225, 234, 243, 252, 258, 264, 270 of `AccessControlDashboard.tsx`.

### Changes

#### File 1: `src/locales/en/translation.json`

**Merge and expand the `accessControl` block** (~line 10698-10731): Add missing keys for entity types (`contractor`, `employee`, `vehicle`), table headers (`person`, `type`, `entryTime`, `exitTime`, `status`, `recordExit`), empty states (`noEntries`), action feedback (`entryRecorded`, `entryFailed`, `exitRecorded`, `exitFailed`), gate dashboard (`gateDashboard`), on-site label (`onSite`), exit label (`exit`), validation statuses (`validationStatus.valid/warning/denied`), and mobile tab short labels (`mobileTabs.onSite/approvals/gatePasses/visitors/workers/analytics/history`).

**Remove duplicate `accessControl` block** (~line 11057-11060): Merge `accessDenied` and `notClientSiteRep` into the first block.

#### File 2: `src/locales/ar/translation.json`

**Same expansion and merge** for Arabic:
- `noEntries` → `لا توجد سجلات دخول`
- `onSite` → `في الموقع`
- `exit` → `خروج`
- `person` → `الشخص`
- `type` → `النوع`
- `entryTime` → `الدخول`
- `exitTime` → `الخروج`
- `status` → `الحالة`
- `recordExit` → `تسجيل خروج`
- `gateDashboard` → `عمليات البوابة`
- `entryRecorded` → `تم تسجيل الدخول بنجاح`
- `entryFailed` → `فشل تسجيل الدخول`
- `exitRecorded` → `تم تسجيل الخروج بنجاح`
- `exitFailed` → `فشل تسجيل الخروج`
- `entityTypes.contractor` → `مقاول`
- `entityTypes.employee` → `موظف`
- `entityTypes.vehicle` → `مركبة`
- `validationStatus.valid` → `صالح`
- `validationStatus.warning` → `تحذير`
- `validationStatus.denied` → `مرفوض`
- `mobileTabs.*` → Arabic short labels (`الموقع`, `موافقات`, `تصاريح`, `زوار`, `عمال`, `تحليلات`, `سجل`)
- `accessDenied` → `تم رفض الوصول`
- `notClientSiteRep` → merged from duplicate block

**Remove duplicate `accessControl` block** (~line 11065-11068).

#### File 3: `src/pages/security/AccessControlDashboard.tsx`

- **Line 34**: Change `useTranslation(['security', 'translation'])` → `useTranslation()`
- **Lines 225, 234, 243, 252, 258, 264, 270**: Replace hardcoded mobile labels with `t()` calls using `accessControl.mobileTabs.*` keys:
  - `"On Site"` → `{t('accessControl.mobileTabs.onSite')}`
  - `"Apps"` → `{t('accessControl.mobileTabs.approvals')}`
  - `"Passes"` → `{t('accessControl.mobileTabs.gatePasses')}`
  - `"Vis"` → `{t('accessControl.mobileTabs.visitors')}`
  - `"Wrk"` → `{t('accessControl.mobileTabs.workers')}`
  - `"Analytic"` → `{t('accessControl.mobileTabs.analytics')}`
  - `"Hist"` → `{t('accessControl.mobileTabs.history')}`

#### File 4: `src/features/security/components/UnifiedAccessLogTable.tsx`

- **Line 57**: Change `useTranslation(['security', 'translation'])` → `useTranslation()`
- **Lines 40, 42, 44**: Change `accessControl.status.valid` → `accessControl.validationStatus.valid` (and same for `warning`, `denied`) to avoid conflict with the string `accessControl.status` used as a table header on line 154.

### Files to Edit
1. `src/locales/en/translation.json` — Add missing keys, merge duplicate block
2. `src/locales/ar/translation.json` — Add missing keys, merge duplicate block
3. `src/pages/security/AccessControlDashboard.tsx` — Fix namespace, localize mobile tabs
4. `src/features/security/components/UnifiedAccessLogTable.tsx` — Fix namespace, fix status key path

