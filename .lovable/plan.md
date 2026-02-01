

# Full Arabic and RTL Support for Gate Pass Module

## Overview

This plan delivers complete Arabic localization and RTL layout support across all Gate Pass interfaces, including:
- My Gate Passes (Internal Employee Module)
- Department Gate Passes (Approval Module)
- Contractor Gate Passes (External Module)
- Gate Pass Verification (Security Module)

---

## Analysis Summary

### Current State

**Existing Arabic Coverage:**
- `src/locales/ar/contractors.json` has basic Gate Pass terms (54-72 lines)
- `src/locales/ar/translation.json` has `deptGatePasses` section (2238-2277)
- `src/locales/ar/translation.json` has `contractors.gatePasses` section (10592-10900)

**Missing Arabic Translations:**
1. **My Gate Passes Module** - No `myGatePasses` namespace exists
2. **Gate Pass Status Labels** - Many status badges still show English
3. **Form Fields & Placeholders** - Several form elements lack Arabic
4. **Pass Type Labels** - Not fully translated
5. **Approval Workflow Terms** - Several approval stages missing
6. **Timeline Labels** - Dialog timeline section incomplete
7. **Navigation Keys** - `navigation.myGatePasses` not in Arabic

### RTL Issues Identified

1. **Back Arrow Icons** - Already using `rtl:rotate-180` (good)
2. **Logical Properties** - Most components already use `ms-`/`me-`/`ps-`/`pe-` (good)
3. **Tables** - Need to verify header alignment
4. **Popover/Dialog Alignment** - Need `dir` prop verification

---

## Implementation Plan

### Phase 1: Add Missing Arabic Translation Keys

#### 1.1 Add `myGatePasses` Namespace to Arabic Translation

Add complete translation section for My Gate Passes module:

```json
"myGatePasses": {
  "title": "تصاريحي",
  "description": "عرض وإدارة طلبات تصاريح الدخول الخاصة بك",
  "myRequests": "طلباتي",
  "createNew": "طلب جديد",
  "createFirst": "إنشاء أول طلب",
  "noResults": "لم تقم بإنشاء أي تصاريح بعد",
  "searchPlaceholder": "البحث بالمرجع، المادة، المركبة...",
  "approvalHistory": "سجل الموافقات",
  "historyTitle": "سجل الموافقات",
  "historyDescriptionApprover": "التصاريح التي راجعتها ووافقت/رفضتها",
  "historyDescriptionUser": "سجل موافقات تصاريحك",
  "approvalActions": "إجراءات الموافقة",
  "noHistory": "لا يوجد سجل موافقات",
  "notApprover": "أنت غير مُعيّن كمُعتمد للتصاريح",
  "createTitle": "إنشاء تصريح داخلي",
  "createDescription": "طلب تصريح دخول جديد للمواد",
  "createSuccess": "تم إنشاء طلب التصريح بنجاح",
  "passDetails": "تفاصيل التصريح",
  "formDescription": "أدخل تفاصيل طلب التصريح",
  "submitRequest": "إرسال الطلب",
  "list": {
    "title": "طلباتي"
  },
  "create": {
    "title": "طلب جديد"
  },
  "history": {
    "title": "سجل الموافقات"
  }
}
```

#### 1.2 Add Navigation Key for My Gate Passes

```json
"navigation": {
  "myGatePasses": "تصاريحي"
}
```

#### 1.3 Complete `gatePasses` Status Labels

Add missing status translations:

```json
"gatePasses": {
  "status": {
    "pending": "معلق",
    "pending_dept_approval": "بانتظار القسم",
    "pending_security_approval": "بانتظار الأمن",
    "pending_contractor_approval": "بانتظار المقاول",
    "pending_dept_ack": "بانتظار إقرار القسم",
    "pm_approved": "وافق مدير المشروع",
    "approved": "معتمد",
    "rejected": "مرفوض",
    "entry_verified": "تم التحقق من الدخول",
    "completed": "مكتمل",
    "used": "مستخدم",
    "expired": "منتهي",
    "cancelled": "ملغي"
  },
  "type": {
    "internal": "داخلي",
    "external": "خارجي"
  },
  "passType": {
    "in": "دخول فقط",
    "out": "خروج فقط",
    "in_out": "دخول وخروج"
  },
  "referenceNumber": "المرجع",
  "material": "المادة",
  "passDate": "التاريخ",
  "vehicle": "المركبة",
  "itemName": "اسم الصنف",
  "itemNamePlaceholder": "اسم المادة أو الصنف",
  "itemDescription": "الوصف",
  "descriptionPlaceholder": "تفاصيل إضافية عن الصنف...",
  "quantity": "الكمية",
  "quantityPlaceholder": "مثال: 10",
  "unit": "الوحدة",
  "unitPlaceholder": "مثال: صناديق، كجم، قطع",
  "vehiclePlate": "لوحة المركبة",
  "vehiclePlatePlaceholder": "مثال: ABC 1234",
  "driverName": "اسم السائق",
  "driverNamePlaceholder": "الاسم الكامل للسائق",
  "driverMobile": "جوال السائق",
  "driverMobilePlaceholder": "رقم هاتف السائق",
  "timeWindowStart": "وقت البدء",
  "timeWindowEnd": "وقت الانتهاء",
  "timeWindowDescription": "وقت الدخول المتوقع",
  "timeWindowEndDescription": "وقت الخروج المتوقع",
  "approver": "المُعتمد",
  "selectApprover": "اختر من يجب أن يوافق على هذا الطلب",
  "approverDescription": "هذا الشخص سيراجع ويوافق على طلبك",
  "noApproversFound": "لا يوجد معتمدين متاحين",
  "selectPassType": "اختر نوع التصريح",
  "action": "الإجراء",
  "actionDate": "تاريخ الإجراء",
  "notes": "الملاحظات",
  "approvalRole": "الدور"
}
```

#### 1.4 Complete `gatePasses.action` Labels (for History page)

```json
"gatePasses": {
  "action": {
    "approved": "تمت الموافقة",
    "rejected": "تم الرفض"
  },
  "role": {
    "pm": "القسم/مدير المشروع",
    "safety": "الأمن"
  }
}
```

#### 1.5 Complete Contractor Gate Pass Translations

Add missing form and dialog terms:

```json
"contractors": {
  "gatePasses": {
    "createPass": "إنشاء تصريح مرور",
    "internalRequest": "طلب داخلي",
    "noProjectRequired": "لا يتطلب مشروع",
    "project": "المشروع",
    "selectProject": "اختر المشروع",
    "noProject": "-- بدون مشروع (داخلي) --",
    "type": "نوع التصريح",
    "selectPassType": "اختر نوع التصريح",
    "materialIn": "مواد واردة",
    "materialOut": "مواد صادرة",
    "equipmentIn": "معدات واردة",
    "equipmentOut": "معدات صادرة",
    "approvalFrom": "الموافقة من",
    "noProjectManager": "لا يوجد مدير مشروع معين",
    "assignPMFirst": "يرجى تعيين مدير مشروع لهذا المشروع أولاً.",
    "selectApprover": "اختر المُعتمد",
    "selectApproverPlaceholder": "اختر معتمداً",
    "internalApproverNote": "للطلبات الداخلية، اختر مديراً أو مشرفاً للموافقة على هذا التصريح.",
    "items": "الأصناف",
    "itemName": "اسم الصنف",
    "itemNamePlaceholder": "مثال: إسمنت",
    "description": "الوصف",
    "descriptionPlaceholder": "تفاصيل إضافية...",
    "quantity": "الكمية",
    "unit": "الوحدة",
    "addItem": "إضافة صنف",
    "photos": "الصور",
    "addPhotos": "إضافة صور",
    "maxPhotos": "الحد الأقصى {{max}} صور",
    "vehicleDriver": "المركبة والسائق",
    "vehiclePlate": "لوحة المركبة",
    "driverName": "اسم السائق",
    "driverMobile": "جوال السائق",
    "passDate": "تاريخ التصريح",
    "timeWindow": "النافذة الزمنية",
    "startTime": "وقت البدء",
    "endTime": "وقت الانتهاء",
    "createPassButton": "إنشاء التصريح",
    "noPasses": "لا توجد تصاريح",
    "reference": "المرجع",
    "requestedBy": "طلب بواسطة"
  },
  "passStatus": {
    "approved": "معتمد",
    "pendingContractor": "بانتظار المقاول",
    "pendingDeptAck": "بانتظار إقرار القسم",
    "pendingDeptApproval": "بانتظار القسم",
    "pendingSecurity": "بانتظار الأمن",
    "pendingPm": "بانتظار م.م.",
    "pendingSafety": "بانتظار السلامة",
    "rejected": "مرفوض",
    "completed": "مكتمل",
    "used": "تم الدخول",
    "expired": "منتهي",
    "cancelled": "ملغي"
  },
  "passType": {
    "material_in": "مواد واردة",
    "material_out": "مواد صادرة",
    "equipment_in": "معدات واردة",
    "equipment_out": "معدات صادرة"
  },
  "gatePassDetail": {
    "title": "تفاصيل التصريح",
    "detailsTab": "التفاصيل",
    "itemsTab": "الأصناف والصور",
    "timelineTab": "المسار الزمني",
    "materialDescription": "وصف المواد",
    "vehicleInfo": "المركبة والسائق",
    "plateNumber": "اللوحة",
    "driverName": "السائق",
    "driverMobile": "الجوال",
    "items": "الأصناف",
    "photos": "الصور",
    "noItems": "لا توجد أصناف مدرجة",
    "noPhotos": "لا توجد صور مرفقة",
    "noTimeline": "لا يوجد مسار زمني",
    "timeline": {
      "created": "تم إنشاء التصريح",
      "contractorApproved": "وافق مستشار المقاول",
      "deptApproved": "وافق ممثل القسم",
      "deptAck": "أقر ممثل القسم",
      "securityApproved": "وافق مشرف الأمن",
      "entryConfirmed": "تم تأكيد الدخول",
      "exitConfirmed": "تم تأكيد الخروج",
      "rejected": "تم رفض التصريح"
    }
  }
}
```

#### 1.6 Complete Gate Pass Verification Panel Translations

```json
"contractors": {
  "gatePasses": {
    "verification": "التحقق من التصريح",
    "scanQR": "مسح رمز QR",
    "enterCode": "أدخل الرمز يدوياً...",
    "verified": "تم التحقق من التصريح",
    "invalid": "تصريح غير صالح",
    "project": "المشروع",
    "company": "الشركة",
    "date": "التاريخ",
    "timeWindow": "الوقت",
    "materials": "المواد",
    "vehicle": "المركبة",
    "driver": "السائق",
    "entryConfirmed": "الدخول",
    "exitConfirmed": "الخروج",
    "noEntry": "لم يدخل",
    "noExit": "لم يخرج",
    "confirmEntry": "تأكيد الدخول",
    "confirmExit": "تأكيد الخروج"
  }
}
```

#### 1.7 Complete Today's Passes Translations

```json
"contractors": {
  "gatePasses": {
    "todayPasses": "تصاريح اليوم المعتمدة",
    "noTodayPasses": "لا توجد تصاريح معتمدة اليوم",
    "exited": "خرج",
    "onSite": "في الموقع",
    "pending": "معلق",
    "awaitingEntry": "بانتظار الدخول",
    "completed": "مكتمل",
    "entryAt": "الدخول",
    "exitAt": "الخروج"
  }
}
```

#### 1.8 Complete Approval Queue Translations

```json
"contractors": {
  "gatePasses": {
    "noPendingApprovals": "لا توجد موافقات معلقة",
    "awaitingContractor": "بانتظار موافقة المقاول",
    "awaitingDeptAck": "بانتظار إقرار القسم",
    "awaitingDeptApproval": "بانتظار موافقة القسم",
    "awaitingSecurity": "بانتظار موافقة الأمن",
    "awaitingPm": "بانتظار موافقة م.م.",
    "awaitingSafety": "بانتظار موافقة السلامة",
    "designatedApprover": "المُعتمد المعين",
    "approvalNotes": "ملاحظات الموافقة (اختياري)...",
    "bulk": {
      "selected": "{{count}} محدد",
      "selectAll": "تحديد الكل",
      "approveAll": "موافقة الكل",
      "rejectAll": "رفض الكل",
      "clearSelection": "مسح"
    }
  }
}
```

#### 1.9 Unit Options Translations

```json
"contractors": {
  "gatePasses": {
    "units": {
      "pcs": "قطعة",
      "bags": "كيس",
      "boxes": "صندوق",
      "kg": "كيلوجرام",
      "tons": "طن",
      "liters": "لتر",
      "meters": "متر",
      "sqm": "متر مربع",
      "rolls": "لفة",
      "sheets": "لوح",
      "pallets": "منصة",
      "drums": "برميل",
      "cylinders": "اسطوانة",
      "sets": "طقم",
      "units": "وحدة"
    }
  }
}
```

---

### Phase 2: RTL Layout Verification and Fixes

#### 2.1 Verify Logical Properties in Components

**Files to verify:**
- `src/pages/my-gate-passes/List.tsx` - Uses `ps-9`, `text-start` (OK)
- `src/pages/my-gate-passes/Create.tsx` - Uses `me-2`, `ps-3` (OK)
- `src/pages/my-gate-passes/History.tsx` - Uses `rtl:rotate-180` (OK)
- `src/components/contractors/GatePassFormDialog.tsx` - Verify `me-` usage
- `src/components/contractors/GatePassDetailDialog.tsx` - Verify `ms-` usage
- `src/components/contractors/GatePassListTable.tsx` - Verify table alignment
- `src/components/contractors/GatePassApprovalQueue.tsx` - Uses `me-1` (OK)
- `src/components/contractors/TodayGatePasses.tsx` - Uses `me-1`, `ms-2` (OK)
- `src/components/contractors/GatePassVerificationPanel.tsx` - Uses `me-2` (OK)

#### 2.2 Fix Any Non-Logical Properties Found

Replace any remaining:
- `ml-` with `ms-`
- `mr-` with `me-`
- `pl-` with `ps-`
- `pr-` with `pe-`
- `left-` with `start-`
- `right-` with `end-`
- `text-left` with `text-start`
- `text-right` with `text-end`

#### 2.3 Add RTL Icon Rotation

Ensure all directional icons have `rtl:rotate-180`:
- Back arrows (already implemented)
- Chevrons in dropdowns
- Navigation arrows

#### 2.4 Dialog and Popover Direction

Ensure all Radix dialogs/popovers inherit direction:
- The global `<html dir="rtl">` setting handles this automatically
- Verify `Calendar` component in date pickers uses `dir` prop

---

### Phase 3: Component Updates

#### 3.1 Update GatePassFormDialog.tsx

Replace hardcoded English unit labels with translated keys:

```typescript
const UNIT_OPTIONS = [
  { value: "pcs", labelKey: "contractors.gatePasses.units.pcs" },
  { value: "bags", labelKey: "contractors.gatePasses.units.bags" },
  // ... etc
];

// Then in render:
{UNIT_OPTIONS.map((opt) => (
  <SelectItem key={opt.value} value={opt.value}>
    {t(opt.labelKey)}
  </SelectItem>
))}
```

#### 3.2 Update GatePassListTable.tsx

Fix "Internal Request" badge to use translation:

```typescript
// Replace hardcoded "Internal Request" and "Internal"
{pass.is_internal_request && !pass.project?.project_name && (
  <Badge>
    {t("contractors.gatePasses.internalRequest", "Internal Request")}
  </Badge>
)}
```

---

### Phase 4: Testing Verification

#### 4.1 Language Switch Test Matrix

| Page | English OK | Arabic OK | RTL Layout OK |
|:-----|:-----------|:----------|:--------------|
| /my-gate-passes | Verify | Verify | Verify |
| /my-gate-passes/create | Verify | Verify | Verify |
| /my-gate-passes/history | Verify | Verify | Verify |
| /dept-gate-passes | Verify | Verify | Verify |
| /dept-gate-passes/list | Verify | Verify | Verify |
| /dept-gate-passes/approvals | Verify | Verify | Verify |
| /dept-gate-passes/today | Verify | Verify | Verify |
| /contractors/gate-passes | Verify | Verify | Verify |
| Gate Pass Detail Dialog | Verify | Verify | Verify |
| Gate Pass Form Dialog | Verify | Verify | Verify |
| Gate Pass Verification Panel | Verify | Verify | Verify |

---

## Files to Modify

| File | Changes |
|:-----|:--------|
| `src/locales/ar/translation.json` | Add `myGatePasses`, update `navigation`, complete `gatePasses`, complete `contractors.gatePasses`, `contractors.passStatus`, `contractors.passType`, `contractors.gatePassDetail` |
| `src/components/contractors/GatePassFormDialog.tsx` | Translate unit options, verify RTL classes |
| `src/components/contractors/GatePassListTable.tsx` | Translate hardcoded "Internal" strings |
| `src/components/contractors/GatePassDetailDialog.tsx` | Verify timeline translations complete |
| `src/pages/my-gate-passes/History.tsx` | Already uses translations (verify coverage) |

---

## Technical Notes

### RTL Compliance Already in Place:
- Global `<html dir="rtl">` set by i18n language change handler
- Components already use CSS logical properties (`ms-`, `me-`, `ps-`, `pe-`)
- Icons with `rtl:rotate-180` for directional arrows
- Date picker uses correct locale via `date-fns/locale/ar`

### Translation Key Organization:
- My Gate Passes module keys under `myGatePasses.*`
- Department Gate Passes keys under `deptGatePasses.*`
- Contractor Gate Passes keys under `contractors.gatePasses.*`
- Shared status labels under `contractors.passStatus.*`
- Pass types under `contractors.passType.*`

### Audit Trail Compliance:
- Translations only affect UI labels, not stored data values
- Database values remain in English (status codes, types, etc.)
- Audit logs display translated labels but store original values

---

## Estimated Translation Keys to Add

| Namespace | Approximate Keys |
|:----------|:-----------------|
| `myGatePasses` | ~25 keys |
| `navigation.myGatePasses` | 1 key |
| `gatePasses.status.*` | ~12 keys |
| `gatePasses.type.*` | ~3 keys |
| `gatePasses.passType.*` | ~3 keys |
| `gatePasses.action.*` | ~2 keys |
| `gatePasses.role.*` | ~2 keys |
| `gatePasses.*` (form fields) | ~20 keys |
| `contractors.gatePasses.*` | ~40 keys |
| `contractors.passStatus.*` | ~12 keys |
| `contractors.passType.*` | ~4 keys |
| `contractors.gatePassDetail.*` | ~25 keys |
| **Total** | **~150 new/updated keys** |

