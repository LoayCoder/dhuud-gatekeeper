

# Bulk Add Checklist Items via Excel Upload

## Problem
Currently, checklist items can only be added one-by-one through the dialog form. For templates with many items (e.g., 30+ inspection questions), this is tedious. Users need bulk import via Excel with a downloadable template.

## Solution
Add two buttons to the `TemplateChecklistEditor` header:
1. **Download Template** — downloads a pre-filled Excel template with column headers and example rows
2. **Bulk Upload** — file input that reads an Excel file, validates rows, and creates items in bulk

## Changes

### 1. Update `TemplateChecklistEditor.tsx`

Add two new buttons next to "Add Item":
- **Download Template** button (Download icon) — generates and downloads an `.xlsx` file using `writeExcelAndDownload` from `src/lib/exceljs-utils.ts`
- **Bulk Upload** button (Upload icon) — hidden file input, reads `.xlsx` using `readExcelAsObjects` from `src/lib/exceljs-utils.ts`

**Download Template columns:**
| Column | Description | Example |
|--------|-------------|---------|
| question | Question (EN) - Required | "Is the fire extinguisher accessible?" |
| question_ar | Question (Arabic) | "هل طفاية الحريق متاحة؟" |
| response_type | pass_fail / yes_no / rating / numeric / text | pass_fail |
| min_value | For numeric type only | 0 |
| max_value | For numeric type only | 100 |
| rating_scale | For rating type (2-10) | 5 |
| is_critical | TRUE / FALSE | FALSE |
| is_required | TRUE / FALSE | TRUE |
| instructions | Instructions (EN) | "Check physical access" |
| instructions_ar | Instructions (Arabic) | "تحقق من الوصول" |

Template includes 2-3 example rows showing different response types.

**Upload flow:**
1. Read Excel file via `readExcelAsObjects`
2. Validate each row: `question` is required, `response_type` must be one of the 5 valid types
3. Show validation errors via toast if any rows are invalid
4. For valid rows, call `useCreateTemplateItem` sequentially with auto-incrementing `sort_order` starting from `(existing items count) + 1`
5. Show success toast with count of imported items
6. Loading state on the upload button during import

### 2. Translation Keys

**EN:**
- `inspections.downloadTemplate` — "Download Template"
- `inspections.bulkUpload` — "Bulk Upload"
- `inspections.bulkUploadSuccess` — "{{count}} items imported successfully"
- `inspections.bulkUploadError` — "Row {{row}}: {{error}}"
- `inspections.invalidResponseType` — "Invalid response type"
- `inspections.questionRequired` — "Question is required"

**AR:** Arabic equivalents

## Files Changed
1. `src/features/incidents/components/inspections/TemplateChecklistEditor.tsx` — add download/upload buttons + logic
2. `src/locales/en/translation.json` — new keys
3. `src/locales/ar/translation.json` — new keys

