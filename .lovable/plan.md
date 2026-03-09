

# Fix Translation Issues for `/security/blacklist`

## Problem
The `BlacklistManagement.tsx` page has ~15 instances of hardcoded `isRTL ? 'Arabic' : 'English'` ternary patterns instead of using `t()` calls. The Zod validation schema also has hardcoded English error messages.

## Changes

### 1. Add missing keys to `src/locales/en/translation.json`

Under `visitors.blacklist`, add:
- `pageTitle`: "Blacklist Management"
- `pageDescription`: "Manage blocked visitors, workers, and contractors"
- `photo`: "Photo"
- `entityType`: "Entity Type"
- `type`: "Type"
- `filterAll`: "All"
- `filterVisitors`: "Visitors"
- `filterWorkers`: "Workers"
- `filterContractors`: "Contractors"
- `entityVisitor`: "Visitor"
- `entityWorker`: "Worker"
- `entityContractor`: "Contractor"
- `validation.nameRequired`: "Name is required"
- `validation.nationalIdRequired`: "National ID is required"
- `validation.reasonMinLength`: "Reason must be at least 10 characters"

### 2. Add Arabic translations to `src/locales/ar/translation.json`

Same keys with Arabic:
- `pageTitle`: "إدارة القائمة السوداء"
- `pageDescription`: "إدارة الزوار والعمال والمقاولين المحظورين"
- `photo`: "الصورة"
- `entityType`: "نوع الكيان"
- `type`: "النوع"
- `filterAll`: "الكل"
- `filterVisitors`: "زوار"
- `filterWorkers`: "عمال"
- `filterContractors`: "مقاولون"
- `entityVisitor`: "زائر"
- `entityWorker`: "عامل"
- `entityContractor`: "مقاول"
- Plus validation keys in Arabic

### 3. Refactor `BlacklistManagement.tsx`

- Convert `addSchema` to `getAddSchema(t)` getter function pattern
- Replace all `isRTL ? ... : ...` ternaries with `t()` calls
- Replace hardcoded entity labels in `entityTypeBadge()` with `t()` calls
- Replace hardcoded tab labels with `t()` calls

### Files Modified

| File | Change |
|------|--------|
| `src/locales/en/translation.json` | Add ~15 missing blacklist keys |
| `src/locales/ar/translation.json` | Add ~15 Arabic translations |
| `src/pages/security/BlacklistManagement.tsx` | Replace all ternaries with `t()`, localize Zod schema |

