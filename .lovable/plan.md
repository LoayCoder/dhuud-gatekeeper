
# Fix Translation Issues for `/security/attendance`

## Problem
The `GuardAttendance.tsx` page and `GuardCheckInWidget.tsx` have:
1. Missing translation keys (~15 keys) that fall back to English fallback strings
2. One hardcoded string `"m late"` (line 329) that isn't using `t()`

## Changes

### 1. Add missing keys to `src/locales/en/translation.json`

Under `security` object (after line 1489), add:
- `readyToCheckIn`: "Ready to Check In?"
- `startYourShift`: "Start your shift by checking in"
- `youAreOnDuty`: "You Are On Duty"
- `confirmCheckIn`: "Confirm Check In"
- `confirmCheckOut`: "Confirm Check Out"
- `checkInDesc`: "You are about to start your shift. Your location will be recorded."
- `checkOutDesc`: "You are about to end your shift. Make sure all tasks are complete."
- `attendanceNotesPlaceholder`: "Add any notes about your shift..."
- `checkedInAt`: "Checked in at {{time}}"
- `lateByMinutes`: "Late by {{minutes}} minutes"
- `accuracy`: "Accuracy: {{meters}}m"
- `geolocationNotSupported`: "Geolocation is not supported"
- `avgLate`: "Avg {{minutes}} min late"
- `overtime`: "{{minutes}} min overtime"
- `mLate`: "{{minutes}}m late"

### 2. Add Arabic translations to `src/locales/ar/translation.json`

Under `security` object (around line 9300+), add the same keys with Arabic:
- `readyToCheckIn`: "هل أنت مستعد لتسجيل الحضور؟"
- `startYourShift`: "ابدأ مناوبتك بتسجيل الحضور"
- `youAreOnDuty`: "أنت في المناوبة"
- `confirmCheckIn`: "تأكيد تسجيل الحضور"
- `confirmCheckOut`: "تأكيد تسجيل الخروج"
- `checkInDesc`: "أنت على وشك بدء مناوبتك. سيتم تسجيل موقعك."
- `checkOutDesc`: "أنت على وشك إنهاء مناوبتك. تأكد من إكمال جميع المهام."
- `attendanceNotesPlaceholder`: "أضف أي ملاحظات حول مناوبتك..."
- `checkedInAt`: "تم تسجيل الحضور في {{time}}"
- `lateByMinutes`: "متأخر {{minutes}} دقيقة"
- `accuracy`: "الدقة: {{meters}} متر"
- `geolocationNotSupported`: "تحديد الموقع الجغرافي غير مدعوم"
- `avgLate`: "متوسط التأخر {{minutes}} دقيقة"
- `overtime`: "{{minutes}} دقيقة إضافية"
- `mLate`: "متأخر {{minutes}} دقيقة"

### 3. Fix hardcoded string in `GuardAttendance.tsx`

Line 329: Replace `{record.late_minutes}m late` with `t('security.mLate', { minutes: record.late_minutes })`

### Files Modified

| File | Change |
|------|--------|
| `src/locales/en/translation.json` | Add ~15 missing security keys |
| `src/locales/ar/translation.json` | Add ~15 Arabic translations |
| `src/pages/security/GuardAttendance.tsx` | Fix hardcoded "m late" string |
