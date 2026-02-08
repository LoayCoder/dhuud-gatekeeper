

# Add Export Button for HSSE Events List

## Summary

The export button UI already exists in the page header but isn't connected to any functionality. This plan will wire it up to export all filtered HSSE Events to Excel or PDF format, including a **Status** column with proper translations.

---

## What Will Be Built

### Export Functionality
- Export all filtered HSSE Events (respects current filters like status, severity, date range, branch)
- Two export formats: **Excel** and **PDF**
- Secure export with permission validation and audit logging
- RTL-compatible with proper Arabic/English labels

### Export Columns (Including Status)

| Column | Label (English) | Label (Arabic) |
|--------|-----------------|----------------|
| Reference | Reference | المرجع |
| Title | Title | العنوان |
| Event Type | Event Type | نوع الحدث |
| Subtype | Subtype | النوع الفرعي |
| **Status** | **Status** | **الحالة** |
| Severity | Severity | الخطورة |
| Occurred At | Occurred At | تاريخ الحدوث |
| Location | Location | الموقع |
| Branch | Branch | الفرع |
| Created At | Created At | تاريخ الإنشاء |

### Status Values Formatting
Status values will be formatted as human-readable labels (using translation keys like `incidents.status.submitted` → "Submitted" or "مقدم"):
- `submitted` → Submitted / مقدم
- `pending_review` → Pending Review / قيد المراجعة
- `investigation_in_progress` → Under Investigation / قيد التحقيق
- `closed` → Closed / مغلق
- etc.

---

## Technical Implementation

### 1. Create Export Hook
**New file:** `src/hooks/use-hsse-events-export.ts`

This hook will:
- Fetch complete incident data for export (more fields than list view)
- Apply the current filters (status, severity, event type, branch, date range)
- Format data with proper translations for status and other fields
- Handle empty state gracefully

### 2. Wire Up IncidentList Page
**Modified file:** `src/pages/incidents/IncidentList.tsx`

Changes:
- Create `handleExport` function that:
  1. Fetches full incident data with current filters
  2. Formats status using translation function (`t('incidents.status.{status}')`)
  3. Calls `performSecureExport` with audit logging
  4. Shows success/error toast
- Pass `onExport={handleExport}` to `IncidentListHeader` component

### Flow Diagram

```text
User clicks "Export to Excel" or "Export to PDF"
    ↓
Fetch incidents matching current filters
    ↓
Format data:
  - Status → t('incidents.status.{status}')
  - Severity → t('incidents.severity.{severity}')
  - Dates → localized format
    ↓
Call performSecureExport (validates permission + logs audit)
    ↓
Download file / Show toast
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/hooks/use-hsse-events-export.ts` | **New** - Export data fetching and formatting |
| `src/pages/incidents/IncidentList.tsx` | Add export handler, pass to header |

---

## Security & Audit

- Permission validation via `validateExportPermission` with menu code `hsse_incidents`
- Audit logging via `logExport` with entity type `incident`
- Tenant isolation enforced in database query
- Only HSSE-access users see the export button (already implemented)

---

## Expected Results

After implementation:
1. Export button (download icon) appears for HSSE users in the header
2. Clicking shows dropdown with Excel and PDF options
3. Export includes all visible columns plus **Status** with human-readable labels
4. Filters apply to exported data (only filtered incidents are exported)
5. Export action is logged for audit purposes
6. Empty state shows toast message when no data to export

