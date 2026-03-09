

# Fix: Missing Arabic Translations for Rate Limit & Threat Geography Widgets

## Problem
The `RateLimitStatsWidget`, `IPBlocklistTable`, `WhitelistTable`, `SuspiciousActivityPanel`, `BlockIPDialog`, `WhitelistIPDialog`, `ThreatMapWidget`, and `ThreatMapLegend` components use ~60 `admin.*` translation keys that have **no Arabic translations**. The AR `admin` object (line 4404) has nested keys for menu access, visitors, etc., but zero rate-limit or threat-map keys. A second `admin` block at line 11204 only has `protectedServer` and `badges`.

## All Missing `admin.*` Keys (~55 unique keys)

### RateLimitStatsWidget (header + stats)
`rateLimitStats`, `blockIP`, `whitelist`, `requests24h`, `failed`, `blocked`, `tempBlocks`, `permBlocks`, `whitelisted`, `threats`, `blockedIPs`, `suspiciousActivity` (as "Activity Log")

### IPBlocklistTable
`noBlockedIPs`, `noBlockedIPsDesc`, `ipAddress`, `type`, `reason`, `attempts`, `expires`, `blockedAt`, `permanent`, `temporary`, `never`, `removeBlock`, `makePermanent`, `addToWhitelist`, `confirmUnblock`, `confirmPermanent`, `confirmWhitelist`, `confirmUnblockDesc`, `confirmPermanentDesc`, `confirmWhitelistDesc`

### WhitelistTable
`noWhitelistedIPs`, `noWhitelistedIPsDesc`, `addedAt`, `confirmRemoveWhitelist`, `confirmRemoveWhitelistDesc`

### SuspiciousActivityPanel
`autoBlocked`, `manualBlock`, `unblocked`, `rateLimitExceeded`, `noSuspiciousActivity`, `noSuspiciousActivityDesc`, `failedAttempts`

### BlockIPDialog
`blockIPAddress`, `blockIPDesc`, `ipAddressDesc`, `blockType`, `selectBlockType`, `duration`, `selectDuration`, `blockReasonPlaceholder`

### WhitelistIPDialog
`whitelistIPAddress`, `whitelistIPDesc`, `whitelistReasonPlaceholder`

### ThreatMapWidget
`threatGeography`, `yourLocation`, `permanentBlock`, `temporaryBlock`, `countries`, `resolveLocations`

### ThreatMapLegend
`legend`, `attackFlow`, `yourServer`, `topSources`

## Fix

### File: `src/locales/ar/translation.json`

Add all ~55 keys to the second `admin` block (line 11204, which gets deep-merged). Add them alongside the existing `protectedServer` and `badges` keys:

**Rate Limit keys:**
- `rateLimitStats` → "تحديد المعدل وحظر IP"
- `blockIP` → "حظر IP"
- `whitelist` → "القائمة البيضاء"
- `requests24h` → "الطلبات (24 ساعة)"
- `failed` → "فاشلة"
- `blocked` → "محظورة"
- `tempBlocks` → "حظر مؤقت"
- `permBlocks` → "حظر دائم"
- `whitelisted` → "مدرج بالقائمة البيضاء"
- `threats` → "التهديدات (24 ساعة)"
- `blockedIPs` → "عناوين IP المحظورة"
- `suspiciousActivity` → "سجل النشاط"
- `noBlockedIPs` → "لا توجد عناوين IP محظورة"
- `noBlockedIPsDesc` → "كل شيء آمن! لا توجد عناوين IP مشبوهة محظورة حالياً."
- `ipAddress` → "عنوان IP"
- `type` → "النوع"
- `reason` → "السبب"
- `attempts` → "المحاولات"
- `expires` → "ينتهي"
- `blockedAt` → "تاريخ الحظر"
- `permanent` → "دائم"
- `temporary` → "مؤقت"
- `never` → "أبداً"
- `removeBlock` → "إزالة الحظر"
- `makePermanent` → "جعله دائماً"
- `addToWhitelist` → "إضافة للقائمة البيضاء"
- `confirmUnblock` → "تأكيد إلغاء الحظر"
- `confirmPermanent` → "تأكيد الحظر الدائم"
- `confirmWhitelist` → "تأكيد الإدراج بالقائمة البيضاء"
- `confirmUnblockDesc` → "سيتمكن عنوان IP هذا من تقديم طلبات التسجيل مرة أخرى. هل أنت متأكد؟"
- `confirmPermanentDesc` → "سيتم حظر عنوان IP هذا بشكل دائم وسيتطلب مراجعة يدوية لإلغاء الحظر."
- `confirmWhitelistDesc` → "سيتجاوز عنوان IP هذا جميع قيود المعدل والحظر. استخدم بحذر."
- Plus: `noWhitelistedIPs`, `noWhitelistedIPsDesc`, `addedAt`, `confirmRemoveWhitelist`, `confirmRemoveWhitelistDesc`
- Plus: `autoBlocked`, `manualBlock`, `unblocked`, `rateLimitExceeded`, `noSuspiciousActivity`, `noSuspiciousActivityDesc`, `failedAttempts`
- Plus: `blockIPAddress`, `blockIPDesc`, `ipAddressDesc`, `blockType`, `selectBlockType`, `duration`, `selectDuration`, `blockReasonPlaceholder`
- Plus: `whitelistIPAddress`, `whitelistIPDesc`, `whitelistReasonPlaceholder`

**Threat Map keys:**
- `threatGeography` → "الجغرافيا التهديدية"
- `yourLocation` → "موقعك"
- `permanentBlock` → "حظر دائم"
- `temporaryBlock` → "حظر مؤقت"
- `countries` → "الدول"
- `resolveLocations` → "تحديد مواقع {{count}} عنوان IP"
- `legend` → "دليل الخريطة"
- `attackFlow` → "مسار الهجوم"
- `yourServer` → "خادمك"
- `topSources` → "أعلى المصادر"

## Files Modified
1. **`src/locales/ar/translation.json`** — Add ~55 keys to the second `admin` block (line 11204)

