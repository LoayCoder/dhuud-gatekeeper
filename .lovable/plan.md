

# Fix: WhatsApp Settings Page Translation

## Problem
Both `WhatsAppSettingsPage.tsx` and `WhatsAppSettings.tsx` use **inline `isRTL ? "Arabic" : "English"` ternaries** for all text (~30 strings). This violates the project's RTL/localization standards and means translations aren't managed through the i18n system. The page wrapper also has mojibake Arabic characters.

## Fix

### 1. Add `whatsappSettings` namespace to English locale
**File:** `src/locales/en/translation.json`

Add ~30 keys:
- `pageTitle`, `pageDescription` (page wrapper)
- `activeProvider`, `activeProviderDesc`, `active`, `configured`, `notConfigured`, `activate`
- `wasenderNotConfigured`, `twilioNotConfigured`, `switchedTo`
- `testMessage`, `testMessageDesc`, `phoneNumber`, `phoneHint`, `messageText`, `messagePlaceholder`
- `sending`, `sendTestMessage`, `sentVia`, `failedToSend`, `enterPhoneNumber`, `messageSentVia`, `failedSendMessage`
- `howToConfigure`, `wasenderStep1`, `wasenderStep2`, `wasenderStep3`, `twilioStep1`, `twilioStep2`

### 2. Add `whatsappSettings` namespace to Arabic locale
**File:** `src/locales/ar/translation.json`

Same ~30 keys with proper Arabic translations (using the existing inline Arabic strings as the source).

### 3. Refactor `WhatsAppSettingsPage.tsx`
Replace mojibake inline strings with `t('whatsappSettings.pageTitle')` and `t('whatsappSettings.pageDescription')`.

### 4. Refactor `WhatsAppSettings.tsx`
Replace all ~30 `isRTL ? ... : ...` ternaries with proper `t()` calls. Examples:
- `isRTL ? "نشط" : "Active"` → `t('whatsappSettings.active')`
- `isRTL ? "مزود الواتساب النشط" : "Active WhatsApp Provider"` → `t('whatsappSettings.activeProvider')`
- Toast messages: `isRTL ? "تم التبديل إلى..." : "Switched to..."` → `t('whatsappSettings.switchedTo', { provider })`

### Files Modified
1. `src/locales/en/translation.json` — Add `whatsappSettings` namespace (~30 keys)
2. `src/locales/ar/translation.json` — Add `whatsappSettings` namespace (~30 keys)
3. `src/pages/admin/WhatsAppSettingsPage.tsx` — Replace inline strings with `t()` calls
4. `src/features/admin/components/WhatsAppSettings.tsx` — Replace all `isRTL ?` ternaries with `t()` calls

