# Comprehensive Arabic Translation Audit Report (2025)

## 📊 Audit Summary
The audit revealed several high-severity issues where English text appears directly in the Arabic interface ("Incorrect Translation") and sections where translations are completely missing ("Missing Translation"). The most critical areas affecting user experience are in the **Incidents**, **Admin**, and **Work Permit (PTW)** modules.

## 📝 Detailed Audit Findings

| # | Location / Key | English Text | Current Arabic Text | Issue Type | Severity | Correct Arabic (MSA) | Notes |
|---|---|---|---|---|---|---|---|
| 1 | `incidents.contractor` | Contractor | Contractor | Incorrect Translation | **High** | المقاول | Identical to English. |
| 2 | `incidents.linkedAsset` | Asset Involved | Asset Involved | Incorrect Translation | **High** | الأصول المعنية | Identical to English. |
| 3 | `incidents.searchAsset` | Search by asset name or code... | Search by asset name or code... | Incorrect Translation | **High** | البحث عن طريق اسم الأصل أو الرمز... | Identical to English. |
| 4 | `incidents.injuryClassification` | Classification | Classification | Incorrect Translation | **High** | التصنيف | Identical to English. |
| 5 | `incidents.damageType` | Type | Type | Incorrect Translation | **High** | النوع | Identical to English. |
| 6 | `incidents.assetSelectionHint` | Optionally link an asset related to this event... | Optionally link an asset related to this event... | Incorrect Translation | **High** | اختيارياً، يمكنك ربط أصل متعلق بهذا الحدث... | Identical to English. |
| 7 | `admin.override.title` | Pending Approvals Override | *Missing* | Missing Translation | **High** | تجاوز الموافقات المعلقة | Critical admin feature untranslated. |
| 8 | `admin.override.description` | Approve stuck incidents... | *Missing* | Missing Translation | **High** | الموافقة على الحوادث العالقة عندما يكون المعتمدون الأصليون غير متاحين | |
| 9 | `admin.override.cardTitle` | Admin Override Available | *Missing* | Missing Translation | **High** | تجاوز المسؤول متاح | |
| 10 | `admin.override.reason` | Override Reason | *Missing* | Missing Translation | **High** | سبب التجاوز | |
| 11 | `admin.override.confirm` | Confirm Override | *Missing* | Missing Translation | **High** | تأكيد التجاوز | |
| 12 | `admin.override.success` | Override Successful | *Missing* | Missing Translation | **High** | تم التجاوز بنجاح | |
| 13 | `ptw.mobile.gpsNotSupported` | GPS is not supported | *Missing* | Missing Translation | **High** | نظام GPS غير مدعوم | Mobile inspection flow. |
| 14 | `ptw.mobile.gpsError` | Could not capture location | *Missing* | Missing Translation | **High** | تعذر التقاط الموقع | |
| 15 | `ptw.mobile.incompleteItems` | Incomplete Items | *Missing* | Missing Translation | **High** | عناصر غير مكتملة | |
| 16 | `ptw.mobile.completeRequired` | Please complete all required checklist items | *Missing* | Missing Translation | **High** | يرجى إكمال جميع عناصر القائمة المطلوبة | |
| 17 | `ptw.mobile.signatureRequired` | Signature Required | *Missing* | Missing Translation | **High** | التوقيع مطلوب | |
| 18 | `ptw.mobile.photoCapture` | Photo Capture | *Missing* | Missing Translation | **High** | التقاط صورة | |
| 19 | `contractors.gatePasses.exitValidation.mismatchTitle` | Exit Rejected | *Missing* | Missing Translation | **High** | تم رفض الخروج | Security gate validation message. |
| 20 | `contractors.gatePasses.exitValidation.vehicleMismatch` | Vehicle plate does not match entry record | *Missing* | Missing Translation | **High** | رقم لوحة المركبة لا يطابق سجل الدخول | |
| 21 | `hsseDashboard.export.pdfSummary` | PDF Summary Report | *Missing* | Missing Translation | **Med** | تقرير ملخص PDF | Export functionality. |
| 22 | `hsseDashboard.trirRate` | TRIR | TRIR | Incorrect Translation | **Med** | معدل تكرار الحوادث المسجلة (TRIR) | KPI Terminology. |
| 23 | `actions.statusLabels.returned_for_correction` | Returned for Correction | Returned for Correction | Incorrect Translation | **High** | معادة للتصحيح | Action status visible to users. |
| 24 | `actions.extensionRequest` | Extension Request | Extension Request | Incorrect Translation | **High** | طلب تمديد | |

## 🔍 Observations & Recommendations

1.  **Duplicate/Split Files**: The Arabic locale has both a massive `translation.json` (mirroring English) and separate domain files like `security.json`, `auth.json`. This creates a high risk of inconsistency where the application might load the "empty" or missing key from the main file instead of the specialized one.
    - **Recommendation:** Consolidate all Arabic translations into `src/locales/ar/translation.json` to match the English structure and ensure reliable loading.
2.  **Untranslated Placeholders**: Many keys in `incidents` contain raw English text. This suggests they were added to the English file but merely copied to Arabic without translation.
3.  **Terminology**: Ensure "Contractor" is consistently translated as "المقاول" and not "المتعاقد" or other variations, as seen in some legacy parts of the system.
4.  **Admin & Security Gaps**: The `admin.override` feature is completely untranslated, which is critical for system administrators managing stuck workflows. Similarly, security gate exit validations are missing, which could confuse guards during rejected exits.
