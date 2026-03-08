

## Plan: Fix i18n for `/contractors/projects` page

### Problem Summary
The `/contractors/projects` page components already use `t()` calls correctly, but several translation keys are missing from the locale files (TYPE B), one value is wrong (TYPE C), and the entire `contractors.projects` section is missing from Arabic.

### Issues Found

| Type | Key | Issue |
|------|-----|-------|
| B | `contractors.projectStatus.*` | Section missing entirely from both EN and AR — used in Projects.tsx and ProjectListTable.tsx |
| B | `contractors.projects.selectProjectManager` | Missing from EN — used in ProjectFormDialog.tsx |
| B | `contractors.projects.dates` | Missing from EN — used in ProjectListTable.tsx |
| B | `contractors.projects.name` | Missing (EN has `projectName` but code uses `name`) |
| B | `contractors.projects.code` | Missing (EN has `projectCode` but code uses `code`) |
| B | `contractors.projects.notes` | Missing from EN — used in ProjectFormDialog.tsx |
| B | `contractors.projects.projectLocation` | Missing from EN — used in ProjectFormDialog.tsx |
| B | `contractors.projects.locationDescription` | Missing from EN — used in ProjectFormDialog.tsx |
| B | `contractors.projects.locationDescriptionPlaceholder` | Missing from EN — used in ProjectFormDialog.tsx |
| B | `contractors.projects.*` (entire section) | Missing from AR locale |
| C | `contractors.projects.description` | EN value is "Description" but should be "Manage contractor projects and assignments" |

### Changes

#### 1. `src/locales/en/translation.json`
- Fix `contractors.projects.description` value from "Description" to "Manage contractor projects and assignments"
- Add missing keys: `selectProjectManager`, `dates`, `name`, `code`, `notes`, `projectLocation`, `locationDescription`, `locationDescriptionPlaceholder`
- Add new `contractors.projectStatus` section with: `planned`, `active`, `completed`, `cancelled`

#### 2. `src/locales/ar/translation.json`
- Add complete `contractors.projects` section with Arabic translations for all ~20 keys
- Add `contractors.projectStatus` section with: `مخطط`, `نشط`, `مكتمل`, `ملغى`

### No component changes needed
All 3 components (Projects.tsx, ProjectListTable.tsx, ProjectFormDialog.tsx) already use correct `t()` calls — this is purely a locale file fix.

### Summary Table
| File | TYPE A | TYPE B | TYPE C |
|------|--------|--------|--------|
| Projects.tsx | 0 | 4 (projectStatus keys) | 1 (description) |
| ProjectListTable.tsx | 0 | 2 (dates, projectStatus) | 0 |
| ProjectFormDialog.tsx | 0 | 5 (selectProjectManager, notes, location keys) | 0 |
| **Total** | **0** | **11 EN + 20 AR** | **1** |

