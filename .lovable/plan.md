

# Fix: Notification Delivery Log Page Translation

## Problem
`NotificationDeliveryLog.tsx` uses ~30 inline `isRTL ? "mojibake" : "English"` ternaries for all text. This violates the project's localization standards.

## Fix

### 1. Add `deliveryLog` namespace to both locale files (~30 keys)

**English keys:** `deliveryLogTab`, `whatsappSettingsTab`, `webhookUrl`, `webhookUrlDesc`, `urlCopied`, `notificationDeliveryLog`, `trackDeliveryStatus`, `refresh`, `all`, `hsse`, `incidents`, `manual`, `searchRecipient`, `channel`, `allChannels`, `whatsapp`, `email`, `push`, `sms`, `status`, `allStatuses`, `pending`, `sent`, `delivered`, `read`, `failed`, `recipient`, `type`, `severity`, `time`, `loading`, `noNotifications`, `incident`, `sourceManual`

**Arabic keys:** Same structure with proper Arabic translations (extracted from existing inline Arabic, fixing the mojibake).

### 2. Refactor `NotificationDeliveryLog.tsx`

Replace all `isRTL ? ... : ...` ternaries with `t('deliveryLog.key')` calls. Examples:
- `isRTL ? "سجل التسليم" : "Delivery Log"` → `t('deliveryLog.deliveryLogTab')`
- `isRTL ? "جميع القنوات" : "All Channels"` → `t('deliveryLog.allChannels')`
- Toast: `isRTL ? 'تم نسخ الرابط' : 'URL copied'` → `t('deliveryLog.urlCopied')`

### Files Modified
1. `src/locales/en/translation.json` — Add `deliveryLog` namespace (~30 keys)
2. `src/locales/ar/translation.json` — Add `deliveryLog` namespace (~30 keys)
3. `src/pages/admin/NotificationDeliveryLog.tsx` — Replace all `isRTL` ternaries with `t()` calls

