

## Plan: Fix Missing Arabic Translations for /security/access-control

### Root Cause Analysis

After analyzing the `/security/access-control` page components, I found:

1. **Hardcoded English strings** in the mobile view tabs (lines 225, 234, 243, 252, 258, 264, 270 in AccessControlDashboard.tsx):
   - "On Site", "Apps", "Passes", "Vis", "Wrk", "Analytic", "Hist"

2. **Missing translation keys** used in `UnifiedAccessLogTable.tsx` that don't exist in the translation files:
   - `accessControl.noEntries` (line 79)
   - `accessControl.exit` (line 136)
   - `accessControl.person` (line 150)
   - `accessControl.type` (line 151)
   - `accessControl.entryTime` (line 152)
   - `accessControl.exitTime` (line 153)
   - `accessControl.status` (line 154)
   - `accessControl.recordExit` (line 213)
   - `accessControl.onSite` (lines 109, 197)
   - `accessControl.entityTypes.contractor` (line 186)
   - `accessControl.entityTypes.employee` (line 186)
   - `accessControl.entityTypes.vehicle` (line 186)
   - `accessControl.status.valid` (line 40)
   - `accessControl.status.warning` (line 42)
   - `accessControl.status.denied` (line 44)

3. **Missing in AccessControlDashboard.tsx**:
   - `accessControl.gateDashboard` (line 156)
   - `accessControl.entryRecorded` (used in hook)
   - `accessControl.entryFailed` (used in hook)
   - `accessControl.exitRecorded` (used in hook)
   - `accessControl.exitFailed` (used in hook)

### Solution

**Step 1**: Add missing keys to `src/locales/en/translation.json` in the `accessControl` block (after line 10731):

```json
"workersOnSite": "Workers",
"gateDashboard": "Gate Operations",
"noEntries": "No access entries found",
"onSite": "On Site",
"exit": "Exit",
"person": "Person",
"type": "Type",
"entryTime": "Entry",
"exitTime": "Exit",
"status": "Status",
"recordExit": "Record Exit",
"entryRecorded": "Entry recorded successfully",
"entryFailed": "Failed to record entry",
"exitRecorded": "Exit recorded successfully",
"exitFailed": "Failed to record exit",
"entityTypes": {
  "visitor": "Visitors",
  "worker": "Workers",
  "contractor": "Contractor",
  "employee": "Employee",
  "vehicle": "Vehicle"
},
"status": {
  "valid": "Valid",
  "warning": "Warning",
  "denied": "Denied"
}
```

**Step 2**: Add corresponding Arabic translations to `src/locales/ar/translation.json` in the `accessControl` block (after line 10085):

```json
"workersOnSite": "العمال",
"gateDashboard": "عمليات البوابة",
"noEntries": "لا توجد سجلات دخول",
"onSite": "في الموقع",
"exit": "خروج",
"person": "الشخص",
"type": "النوع",
"entryTime": "الدخول",
"exitTime": "الخروج",
"status": "الحالة",
"recordExit": "تسجيل خروج",
"entryRecorded": "تم تسجيل الدخول بنجاح",
"entryFailed": "فشل تسجيل الدخول",
"exitRecorded": "تم تسجيل الخروج بنجاح",
"exitFailed": "فشل تسجيل الخروج",
"entityTypes": {
  "visitor": "الزوار",
  "worker": "العمال",
  "contractor": "مقاول",
  "employee": "موظف",
  "vehicle": "مركبة"
},
"status": {
  "valid": "صالح",
  "warning": "تحذير",
  "denied": "مرفوض"
}
```

**Step 3**: Update `AccessControlDashboard.tsx` to remove hardcoded mobile tab labels by using `t()` with the existing tab keys instead of hardcoded strings.

### Files to Edit
1. `src/locales/en/translation.json` - Add missing English keys
2. `src/locales/ar/translation.json` - Add missing Arabic keys  
3. `src/pages/security/AccessControlDashboard.tsx` - Remove hardcoded mobile labels

### Expected Result
All text on `/security/access-control` page will display correctly in Arabic when the Arabic language is selected, including:
- Mobile tab labels
- Table headers
- Status badges
- Toast notifications
- Empty states

