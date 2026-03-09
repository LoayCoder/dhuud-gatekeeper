

# Fix Translation Issues for `/visitors/register` Page

## Problem
The Visitor Pre-Registration page has ~25 missing translation keys in both English and Arabic locale files, plus hardcoded English strings in the Zod validation schema. Many `t()` calls use inline fallback strings that mask the missing keys.

## Changes Required

### 1. Add missing keys to `src/locales/en/translation.json`

Under `visitors.register.sections`, add:
- `userType`: "Visitor Type"
- `host`: "Host Information"

Under `visitors.register`, add:
- `requestSubmitted`: "Request Submitted"
- `pendingApproval`: "Your visit request is pending security approval"
- `approvalMessage`: "Once approved, the visitor will receive their QR access code and the host will be notified via WhatsApp."
- `submitRequest`: "Submit Request"

Add new `visitors.userType` section:
- `external` / `externalDesc` / `internal` / `internalDesc`

Under `visitors.fields`, add:
- `phone`, `nationality`, `hostUser`, `hostUserDesc`, `hostName`, `hostPhone`, `hostEmail`

Under `visitors.placeholders`, add:
- `phone`, `nationality`, `selectHost`, `hostName`, `hostPhone`, `hostEmail`

Under `visitors.scan` (used by VisitorIdScanner):
- `scanSuccess`, `scanId`, `scanning`

### 2. Add Arabic translations to `src/locales/ar/translation.json`

Same keys with proper Arabic translations:
- "نوع الزائر", "معلومات المضيف", "تم تقديم الطلب", "طلب الزيارة بانتظار موافقة الأمن"
- "زائر خارجي", "بدون وصول للمنصة", "مستخدم داخلي", "لديه وصول للمنصة"
- "رقم الجوال", "الجنسية", "اختيار المضيف", etc.

### 3. Localize Zod validation messages in `VisitorPreRegistration.tsx`

Refactor the `formSchema` into a getter function `getFormSchema(t)` following the project's getter function pattern, so validation error messages like "Name is required", "Valid phone number is required" are passed through `t()`.

### 4. Summary of files to modify
| File | Change |
|------|--------|
| `src/locales/en/translation.json` | Add ~25 missing keys |
| `src/locales/ar/translation.json` | Add ~25 Arabic translations |
| `src/pages/visitors/VisitorPreRegistration.tsx` | Refactor Zod schema to use `t()` via getter pattern |

