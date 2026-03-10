

# Fix: Missing `admin.override` and `admin.approvals.categories` Translations

## Problem

The `/admin/pending-approvals-override` page uses ~25 translation keys under `admin.override.*` and `admin.approvals.categories.*` that do not exist in either the English or Arabic translation files. All strings currently rely on inline fallback defaults (`t('key', 'Fallback')`), meaning Arabic users see English text.

## Translation Keys Needed

**`admin.override` (~18 keys):** title, description, pendingItems, minDaysStuck, noItems, stuckFor, override, modalTitle, modalDescription, currentStatus, originalApprover, originalApproverPlaceholder, reason, reasonPlaceholder, reasonMinLength, confirm, success, successDescription

**`admin.approvals.categories` (6 keys):** incident, gatePass, worker, contractor, visitor, asset

## Fix

### File 1: `src/locales/en/translation.json`
Add `override` and `approvals` sub-objects inside the existing `admin` object (after line 11217, before the closing `}`):

```json
"override": {
  "title": "Pending Approvals Override",
  "description": "Review and override stuck approval workflows across all modules",
  "pendingItems": "pending items",
  "minDaysStuck": "Minimum Days Pending",
  "noItems": "No pending approvals",
  "stuckFor": "Pending For",
  "override": "Override",
  "modalTitle": "Override Approval",
  "modalDescription": "This action will bypass the normal approval workflow.",
  "currentStatus": "Current Status",
  "originalApprover": "Original Approver",
  "originalApproverPlaceholder": "Name of the person who should have approved",
  "reason": "Override Reason",
  "reasonPlaceholder": "Explain why this approval is being overridden...",
  "reasonMinLength": "Reason must be at least 10 characters",
  "confirm": "Confirm Override",
  "success": "Override Successful",
  "successDescription": "The approval has been overridden successfully"
},
"approvals": {
  "categories": {
    "incident": "Incidents",
    "gatePass": "Gate Passes",
    "worker": "Workers",
    "contractor": "Contractors",
    "visitor": "Visitors",
    "asset": "Assets"
  }
}
```

### File 2: `src/locales/ar/translation.json`
Add the same structure with Arabic translations inside the `admin` object:

```json
"override": {
  "title": "تجاوز الموافقات المعلقة",
  "description": "مراجعة وتجاوز سير عمل الموافقات المتوقفة عبر جميع الوحدات",
  "pendingItems": "عناصر معلقة",
  "minDaysStuck": "الحد الأدنى لأيام الانتظار",
  "noItems": "لا توجد موافقات معلقة",
  "stuckFor": "معلق منذ",
  "override": "تجاوز",
  "modalTitle": "تجاوز الموافقة",
  "modalDescription": "هذا الإجراء سيتجاوز سير عمل الموافقة العادي.",
  "currentStatus": "الحالة الحالية",
  "originalApprover": "المعتمد الأصلي",
  "originalApproverPlaceholder": "اسم الشخص الذي كان يجب أن يوافق",
  "reason": "سبب التجاوز",
  "reasonPlaceholder": "اشرح سبب تجاوز هذه الموافقة...",
  "reasonMinLength": "يجب أن يكون السبب 10 أحرف على الأقل",
  "confirm": "تأكيد التجاوز",
  "success": "تم التجاوز بنجاح",
  "successDescription": "تم تجاوز الموافقة بنجاح"
},
"approvals": {
  "categories": {
    "incident": "الحوادث",
    "gatePass": "تصاريح الدخول",
    "worker": "العمال",
    "contractor": "المقاولون",
    "visitor": "الزوار",
    "asset": "الأصول"
  }
}
```

### Files Modified
1. `src/locales/en/translation.json` — Add ~24 keys under `admin.override` and `admin.approvals.categories`
2. `src/locales/ar/translation.json` — Add same ~24 keys with Arabic translations

