

## Problem

The Arabic translation file has `"inspectionDashboard": "لوحة التفتيش"` as a flat string (line 5682), but it needs to be a full nested object matching the English structure with ~30 keys for stats, charts, findings, classifications, etc.

The English keys exist and are correct. The Arabic file just needs the object expanded.

## Fix

Replace line 5682 in `src/locales/ar/translation.json` — change the flat string to the full Arabic translation object:

```json
"inspectionDashboard": {
  "title": "لوحة التفتيش",
  "description": "نظرة عامة على جلسات التفتيش والامتثال والنتائج",
  "viewAllSessions": "عرض جميع الجلسات",
  "analytics": "التحليلات",
  "stats": {
    "totalSessions": "إجمالي الجلسات",
    "inProgress": "قيد التنفيذ",
    "avgCompliance": "متوسط الامتثال",
    "openFindings": "نتائج مفتوحة"
  },
  "overdueAlert": {
    "title": "تفتيشات متأخرة",
    "description": "{{count}} أصول متأخرة عن موعد التفتيش",
    "viewAssets": "عرض الأصول"
  },
  "charts": {
    "complianceTrend": "اتجاه الامتثال",
    "complianceTrendDesc": "متوسط معدل الامتثال خلال الأشهر الستة الماضية",
    "findingsDistribution": "توزيع النتائج",
    "findingsDistributionDesc": "تفصيل حسب نوع التصنيف",
    "noData": "لا توجد بيانات",
    "compliance": "الامتثال",
    "count": "العدد"
  },
  "recentFindings": {
    "title": "النتائج المفتوحة الأخيرة",
    "description": "أحدث النتائج التي تتطلب اهتمامًا",
    "noFindings": "لا توجد نتائج مفتوحة",
    "noDescription": "لم يتم تقديم وصف"
  },
  "classifications": {
    "critical_nc": "عدم مطابقة حرج",
    "major_nc": "عدم مطابقة رئيسي",
    "minor_nc": "عدم مطابقة ثانوي",
    "observation": "ملاحظة",
    "ofi": "فرصة للتحسين"
  },
  "export": {
    "title": "تصدير",
    "pdf": "تصدير كـ PDF",
    "csv": "تصدير كـ CSV",
    "excel": "تصدير كـ Excel",
    "pdfSuccess": "تم إنشاء تقرير PDF",
    "csvSuccess": "تم تصدير CSV",
    "excelSuccess": "تم تصدير Excel",
    "error": "فشل التصدير"
  }
}
```

## Files Modified

1. **`src/locales/ar/translation.json`** — Replace line 5682 (flat string) with the full nested object (~45 lines)

