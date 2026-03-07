#!/usr/bin/env node
/**
 * i18n Full Audit & Fix Script
 * 
 * Handles 5 categories:
 * 1. MISSING KEYS: Keys in EN but not AR → adds Arabic translation
 * 2. EMPTY VALUES: AR keys with "" → replaces with Arabic translation
 * 3. UNTRANSLATED VALUES: AR keys still in English → translates to Arabic
 * 4. PLACEHOLDER INTEGRITY: Verifies {{variable}} matches between EN/AR
 * 5. RTL CHECK: Ensures no Arabic strings break RTL rendering
 * 
 * Usage: node scripts/i18n-audit-fix.cjs
 */

const fs = require('fs');
const path = require('path');

// ============================================================
// 1. DEEP-MERGE JSON PARSER (handles duplicate keys)
// ============================================================
function deepMerge(target, source) {
  for (const [k, v] of Object.entries(source)) {
    if (v && typeof v === 'object' && !Array.isArray(v) &&
        target[k] && typeof target[k] === 'object' && !Array.isArray(target[k])) {
      deepMerge(target[k], v);
    } else {
      target[k] = v;
    }
  }
  return target;
}

function parseJsonDedup(text) {
  let i = 0;
  const len = text.length;

  function skipWS() { while (i < len && /\s/.test(text[i])) i++; }

  function parseString() {
    if (text[i] !== '"') throw new Error(`Expected " at pos ${i}`);
    i++;
    let s = '';
    while (i < len) {
      if (text[i] === '\\') {
        const next = text[i + 1];
        switch (next) {
          case '"': s += '"'; break;
          case '\\': s += '\\'; break;
          case '/': s += '/'; break;
          case 'b': s += '\b'; break;
          case 'f': s += '\f'; break;
          case 'n': s += '\n'; break;
          case 'r': s += '\r'; break;
          case 't': s += '\t'; break;
          case 'u': {
            const hex = text.slice(i + 2, i + 6);
            s += String.fromCharCode(parseInt(hex, 16));
            i += 4; break;
          }
          default: s += next;
        }
        i += 2; continue;
      }
      if (text[i] === '"') { i++; return s; }
      s += text[i]; i++;
    }
    throw new Error('Unterminated string');
  }

  function parseValue() {
    skipWS();
    if (text[i] === '"') return parseString();
    if (text[i] === '{') return parseObject();
    if (text[i] === '[') return parseArray();
    if (text[i] === 't') { i += 4; return true; }
    if (text[i] === 'f') { i += 5; return false; }
    if (text[i] === 'n') { i += 4; return null; }
    const start = i;
    if (text[i] === '-') i++;
    while (i < len && /[0-9]/.test(text[i])) i++;
    if (text[i] === '.') { i++; while (i < len && /[0-9]/.test(text[i])) i++; }
    if (text[i] === 'e' || text[i] === 'E') {
      i++;
      if (text[i] === '+' || text[i] === '-') i++;
      while (i < len && /[0-9]/.test(text[i])) i++;
    }
    return Number(text.slice(start, i));
  }

  function parseArray() {
    i++;
    const arr = [];
    skipWS();
    if (text[i] === ']') { i++; return arr; }
    while (true) {
      arr.push(parseValue());
      skipWS();
      if (text[i] === ']') { i++; return arr; }
      if (text[i] === ',') { i++; continue; }
      throw new Error(`Expected , or ] at pos ${i}`);
    }
  }

  function parseObject() {
    i++;
    const obj = {};
    skipWS();
    if (text[i] === '}') { i++; return obj; }
    while (true) {
      skipWS();
      const key = parseString();
      skipWS();
      if (text[i] !== ':') throw new Error(`Expected : at pos ${i}`);
      i++;
      const value = parseValue();
      if (key in obj) {
        if (value && typeof value === 'object' && !Array.isArray(value) &&
            obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
          deepMerge(obj[key], value);
        } else {
          obj[key] = value;
        }
      } else {
        obj[key] = value;
      }
      skipWS();
      if (text[i] === '}') { i++; return obj; }
      if (text[i] === ',') { i++; continue; }
      throw new Error(`Expected , or } at pos ${i}`);
    }
  }

  skipWS();
  return parseObject();
}

// ============================================================
// 2. EN→AR TRANSLATION DICTIONARY
// ============================================================
const DICTIONARY = {
  // Common UI
  "Save": "حفظ", "Cancel": "إلغاء", "Delete": "حذف", "Edit": "تعديل",
  "Submit": "إرسال", "Back": "رجوع", "Next": "التالي", "Previous": "السابق",
  "Search": "بحث", "Filter": "تصفية", "View": "عرض", "Details": "التفاصيل",
  "All": "الكل", "None": "لا شيء", "Yes": "نعم", "No": "لا",
  "OK": "حسناً", "Close": "إغلاق", "Open": "فتح", "Create": "إنشاء",
  "Update": "تحديث", "Add": "إضافة", "Remove": "إزالة", "Clear": "مسح",
  "Reset": "إعادة تعيين", "Refresh": "تحديث", "Loading...": "جاري التحميل...",
  "Loading": "جاري التحميل", "Saving...": "جاري الحفظ...", "Saving": "جاري الحفظ",
  "Error": "خطأ", "Success": "نجاح", "Warning": "تحذير", "Info": "معلومات",
  "Confirm": "تأكيد", "Continue": "متابعة", "Done": "تم", "Finish": "إنهاء",
  "Select": "اختر", "Selected": "محدد", "Required": "مطلوب", "Optional": "اختياري",
  "Enabled": "مفعّل", "Disabled": "معطّل", "Active": "نشط", "Inactive": "غير نشط",
  "Name": "الاسم", "Description": "الوصف", "Title": "العنوان", "Status": "الحالة",
  "Date": "التاريخ", "Time": "الوقت", "Type": "النوع", "Category": "الفئة",
  "Priority": "الأولوية", "Notes": "ملاحظات", "Comments": "تعليقات",
  "Location": "الموقع", "Site": "الموقع", "Branch": "الفرع", "Department": "القسم",
  "Actions": "الإجراءات", "Settings": "الإعدادات", "Profile": "الملف الشخصي",
  "Dashboard": "لوحة التحكم", "Reports": "التقارير", "Export": "تصدير",
  "Import": "استيراد", "Download": "تنزيل", "Upload": "رفع", "Print": "طباعة",
  "Pending": "معلق", "Approved": "موافق عليه", "Rejected": "مرفوض",
  "Completed": "مكتمل", "In Progress": "قيد التنفيذ", "Draft": "مسودة",
  "Closed": "مغلق", "Open": "مفتوح", "Resolved": "تم الحل",
  "Copy": "نسخ", "Undo": "تراجع", "Retry": "إعادة المحاولة",
  "Light": "فاتح", "Dark": "داكن", "System": "النظام",
  "Toggle theme": "تبديل السمة", "Change language": "تغيير اللغة",
  "Select All": "تحديد الكل", "Clear All": "مسح الكل",
  "No data available": "لا تتوفر بيانات", "No results found": "لم يتم العثور على نتائج",
  "Unknown": "غير معروف", "Not Set": "غير محدد",
  
  // Auth
  "Sign In": "تسجيل الدخول", "Sign Out": "تسجيل الخروج", "Log out": "تسجيل الخروج",
  "Sign Up": "إنشاء حساب", "Email": "البريد الإلكتروني", "Password": "كلمة المرور",
  "Forgot password?": "نسيت كلمة المرور؟", "Welcome Back": "مرحباً بعودتك",
  "Create Account": "إنشاء حساب", "Confirm Password": "تأكيد كلمة المرور",
  
  // HSSE Terms
  "Incident": "حادث", "Incidents": "الحوادث", "Observation": "ملاحظة",
  "Observations": "الملاحظات", "Investigation": "تحقيق", "Investigations": "التحقيقات",
  "Corrective Action": "إجراء تصحيحي", "Corrective Actions": "الإجراءات التصحيحية",
  "Risk Assessment": "تقييم المخاطر", "Safety": "السلامة", "Security": "الأمن",
  "Health": "الصحة", "Environment": "البيئة", "Hazard": "خطر",
  "Near Miss": "حادثة وشيكة", "Injury": "إصابة", "Damage": "ضرر",
  "Fire": "حريق", "Emergency": "طوارئ", "Patrol": "دورية",
  "Inspection": "فحص", "Audit": "تدقيق", "Compliance": "الامتثال",
  "Severity": "الخطورة", "Low": "منخفض", "Medium": "متوسط",
  "High": "عالي", "Critical": "حرج",
  
  // Security
  "Guard": "حارس", "Visitor": "زائر", "Contractor": "مقاول",
  "Worker": "عامل", "Gate": "بوابة", "Checkpoint": "نقطة تفتيش",
  "Zone": "منطقة", "Shift": "وردية", "Roster": "جدول المناوبات",
  "Access Denied": "تم رفض الوصول", "Access Granted": "تم منح الوصول",
  "Entry": "دخول", "Exit": "خروج", "On Site": "في الموقع",
  "Check In": "تسجيل الدخول", "Check Out": "تسجيل الخروج",
  
  // Assets
  "Asset": "أصل", "Assets": "الأصول", "Asset Management": "إدارة الأصول",
  "Maintenance": "الصيانة", "Warranty": "الضمان", "Depreciation": "الإهلاك",
  "Transfer": "تحويل", "Disposal": "إتلاف",
  
  // Workflow
  "Submitted": "تم الإرسال", "Under Review": "قيد المراجعة",
  "Pending Approval": "في انتظار الموافقة", "Awaiting Assignment": "في انتظار التعيين",
  "Expert Screening": "فحص الخبير", "Manager Review": "مراجعة المدير",
  "HSSE Validation": "تحقق HSSE", "Final Closure": "الإغلاق النهائي",
  
  // Time
  "Today": "اليوم", "Yesterday": "أمس", "This Week": "هذا الأسبوع",
  "This Month": "هذا الشهر", "Last Month": "الشهر الماضي",
  "Last 7 days": "آخر 7 أيام", "Last 30 Days": "آخر 30 يوم",
  "hours": "ساعات", "minutes": "دقائق", "seconds": "ثواني", "days": "أيام",
  
  // Misc UI
  "Overview": "نظرة عامة", "Summary": "ملخص", "Total": "الإجمالي",
  "Average": "المتوسط", "Count": "العدد", "Percentage": "النسبة المئوية",
  "Chart": "رسم بياني", "Table": "جدول", "List": "قائمة", "Grid": "شبكة",
  "Map": "خريطة", "Calendar": "التقويم", "Timeline": "الجدول الزمني",
  "Notifications": "الإشعارات", "Alerts": "التنبيهات",
  "Configuration": "التكوين", "Preferences": "التفضيلات",
  "Help": "مساعدة", "About": "حول", "Version": "الإصدار",
  "Verify": "تحقق", "Validate": "التحقق من صحة",
  "Assign": "تعيين", "Reassign": "إعادة تعيين",
  "Approve": "موافقة", "Reject": "رفض", "Review": "مراجعة",
  "Start": "بدء", "Stop": "إيقاف", "Pause": "إيقاف مؤقت", "Resume": "استئناف",
  "Complete": "إكمال", "Reopen": "إعادة فتح",
  "Escalate": "تصعيد", "Delegate": "تفويض",
  "Generated": "تم الإنشاء", "Updated": "تم التحديث", "Created": "تم الإنشاء",
  "Deleted": "تم الحذف", "Restored": "تم الاستعادة",
  "Logged Out": "تم تسجيل الخروج",
  "Coming Soon": "قريباً", "Beta": "تجريبي",
  "more": "المزيد", "less": "أقل", "Show All": "عرض الكل",
  "Expand": "توسيع", "Collapse": "طي",
  "Photo": "صورة", "Photos": "صور", "Video": "فيديو",
  "Document": "مستند", "Documents": "المستندات", "File": "ملف", "Files": "ملفات",
  "Excellent": "ممتاز", "Good": "جيد", "Fair": "مقبول", "Poor": "ضعيف",
  "Needs Improvement": "يحتاج تحسين",
  "Performance": "الأداء", "Score": "الدرجة", "Rating": "التقييم",
  "Leaderboard": "لوحة المتصدرين", "Training": "التدريب",
  "Attendance": "الحضور", "Punctuality": "الالتزام بالمواعيد",
  "Report": "تقرير", "Generate": "إنشاء", "Schedule": "جدول",
  "Assigned To": "معيّن إلى", "Reported By": "أبلغ بواسطة", "Created By": "أنشأه",
  "Due Date": "تاريخ الاستحقاق", "Start Date": "تاريخ البدء",
  "End Date": "تاريخ الانتهاء",
  "Supervisor": "مشرف", "Manager": "مدير",
  "Team": "الفريق", "Teams": "الفرق",
  "Role": "الدور", "Roles": "الأدوار", "Permission": "الصلاحية",
  "User": "المستخدم", "Users": "المستخدمون",
  "Organization": "المنظمة", "Company": "الشركة",
  "Project": "المشروع", "Projects": "المشاريع",
  "GPS": "GPS", "QR Code": "رمز QR", "Barcode": "باركود",
  "Camera": "الكاميرا", "Gallery": "المعرض",
  "Offline": "غير متصل", "Online": "متصل",
  "Sync": "مزامنة", "Syncing...": "جارٍ المزامنة...",
  "Connected": "متصل", "Disconnected": "غير متصل",
  "Real-time updates active": "التحديثات المباشرة نشطة",
  "Live": "مباشر",
  "Acknowledge": "إقرار", "Acknowledged": "تم الإقرار",
  "Mark Resolved": "تحديد كمحلول",
  "Confirm Entry": "تأكيد الدخول", "Record Exit": "تسجيل الخروج",
  "Log Entry": "تسجيل الدخول",
  "Not found": "غير موجود",
  "No data": "لا توجد بيانات",
  "records found": "سجلات موجودة",
  "Back to": "العودة إلى",
  "View All": "عرض الكل",
  "Show More": "عرض المزيد",
  "No entries found": "لم يتم العثور على سجلات",
  "Duration": "المدة",
  "Permanent": "دائم",
  "Temporary": "مؤقت",
  "Valid": "صالح",
  "Invalid": "غير صالح",
  "Expired": "منتهي الصلاحية",
  "Current": "الحالي",
  "New": "جديد",
  "Old": "قديم",
  "Before": "قبل", "After": "بعد",
  "From": "من", "To": "إلى",
  "Min": "الحد الأدنى", "Max": "الحد الأقصى",
  "Minimum": "الحد الأدنى", "Maximum": "الحد الأقصى",
  "hours ago": "منذ ساعات",
  "Please wait": "يرجى الانتظار",
  "Processing...": "جاري المعالجة...",
  "Scanning...": "جاري المسح...",
  "Verifying...": "جاري التحقق...",
  "Generating...": "جاري الإنشاء...",
  "Submitting...": "جاري الإرسال...",
  "Deleting...": "جاري الحذف...",
  "Canceling...": "جاري الإلغاء...",
  "Please select": "يرجى الاختيار",
  "Are you sure?": "هل أنت متأكد؟",
  "This action cannot be undone.": "لا يمكن التراجع عن هذا الإجراء.",
  "This action cannot be undone": "لا يمكن التراجع عن هذا الإجراء",
  "successfully": "بنجاح",
  "Failed to": "فشل في",
  "failed": "فشل",
  "Not available": "غير متاح",
  "Information": "معلومات",
  "Reference": "المرجع",
  "Code": "الرمز",
  "Number": "الرقم",
  "Amount": "المبلغ",
  "Value": "القيمة",
  "Cost": "التكلفة",
  "Price": "السعر",
  "Reason": "السبب",
  "Address": "العنوان",
  "Mobile": "الجوال",
  "Phone": "الهاتف",
  "Nationality": "الجنسية",
  "Country": "الدولة",
  "City": "المدينة",
  "Street": "الشارع",
  "Region": "المنطقة",
  "Area": "المنطقة",
  "Building": "المبنى",
  "Floor": "الطابق",
  "Unit": "الوحدة",
  "Permit": "تصريح",
  "License": "رخصة",
  "Certificate": "شهادة",
  "Pass": "بطاقة دخول",
  "Assigned": "معيّن",
  "Unassigned": "غير معيّن",
  "Overdue": "متأخر",
  "On Track": "في الموعد",
  "At Risk": "معرض للخطر",
  "On Time": "في الوقت المحدد",
  "Late": "متأخر",
  "Early": "مبكر",
  "Violation": "مخالفة",
  "Breach": "اختراق",
  "Compliance": "الامتثال",
  "Non-compliance": "عدم الامتثال",
  "Regulation": "اللوائح",
  "Policy": "السياسة",
  "Procedure": "الإجراء",
  "Standard": "المعيار",
  "Criterion": "المعيار",
  "Finding": "النتيجة",
  "Recommendation": "التوصية",
  "Not Supported": "غير مدعوم",
  "Features": "الميزات",
  "Provider": "المزود",
  "No Show": "عدم حضور",
  "record": "سجل",
  "records": "سجلات",
  "item": "عنصر",
  "items": "عناصر",
  "of": "من",
  "or": "أو",
  "and": "و",
  "with": "مع",
  "without": "بدون",
  "in": "في",
  "at": "في",
  "by": "بواسطة",
  "for": "لـ",
  "to": "إلى",
  "from": "من",
};

// Sentence-level translations for common patterns
const SENTENCE_DICT = {
  "Are you sure you want to delete": "هل أنت متأكد من الحذف",
  "This action cannot be undone": "لا يمكن التراجع عن هذا الإجراء",
  "No data available": "لا تتوفر بيانات",
  "No results found": "لم يتم العثور على نتائج",
  "Something went wrong": "حدث خطأ ما",
  "Please try again": "يرجى المحاولة مرة أخرى",
  "successfully created": "تم الإنشاء بنجاح",
  "successfully updated": "تم التحديث بنجاح",
  "successfully deleted": "تم الحذف بنجاح",
  "Failed to load": "فشل في التحميل",
  "Failed to save": "فشل في الحفظ",
  "Failed to delete": "فشل في الحذف",
  "Failed to create": "فشل في الإنشاء",
  "Failed to update": "فشل في التحديث",
  "Click to": "اضغط لـ",
  "Select a": "اختر",
  "Enter a": "أدخل",
  "No records": "لا توجد سجلات",
  "Not found": "غير موجود",
  "Access denied": "تم رفض الوصول",
  "Permission denied": "تم رفض الصلاحية",
  "Not authorized": "غير مصرح",
  "Session expired": "انتهت الجلسة",
};

// ============================================================
// 3. HELPER FUNCTIONS
// ============================================================

// Check if string contains Arabic characters
function containsArabic(str) {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(str);
}

// Check if string is purely English/Latin (no Arabic)
function isEnglishOnly(str) {
  if (!str || str.trim().length === 0) return false;
  // Remove placeholders, numbers, punctuation, special chars
  const cleaned = str
    .replace(/\{\{[^}]+\}\}/g, '') // remove {{placeholders}}
    .replace(/[0-9.,;:!?@#$%^&*()_+\-=\[\]{}'"/\\|<>~`\n\r\t ]/g, '') // remove numbers/punctuation/spaces
    .replace(/[\u200B-\u200D\uFEFF]/g, ''); // remove zero-width chars
  if (cleaned.length === 0) return false; // only had placeholders/numbers
  return !containsArabic(cleaned) && /[a-zA-Z]/.test(cleaned);
}

// Extract {{placeholders}} from a string
function extractPlaceholders(str) {
  const matches = str.match(/\{\{[^}]+\}\}/g);
  return matches ? matches.sort() : [];
}

// Try to translate using dictionary
function translateWithDict(enValue) {
  // Exact match
  if (DICTIONARY[enValue]) return DICTIONARY[enValue];
  
  // Try sentence-level match
  for (const [pattern, translation] of Object.entries(SENTENCE_DICT)) {
    if (enValue.toLowerCase().includes(pattern.toLowerCase())) {
      // partial match found but can't reliably translate the whole string
    }
  }
  
  // For short strings (1-3 words), try word-by-word
  const words = enValue.split(/\s+/);
  if (words.length <= 3) {
    const translated = words.map(w => DICTIONARY[w] || DICTIONARY[w.charAt(0).toUpperCase() + w.slice(1)] || null);
    if (translated.every(t => t !== null)) {
      return translated.join(' ');
    }
  }
  
  return null;
}

// Get all leaf paths from an object
function getAllPaths(obj, prefix = '') {
  const paths = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullPath = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(paths, getAllPaths(value, fullPath));
    } else {
      paths[fullPath] = value;
    }
  }
  return paths;
}

// Set a value at a nested path
function setNestedValue(obj, path, value) {
  const keys = path.split('.');
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!current[keys[i]] || typeof current[keys[i]] !== 'object') {
      current[keys[i]] = {};
    }
    current = current[keys[i]];
  }
  current[keys[keys.length - 1]] = value;
}

// Get a value at a nested path
function getNestedValue(obj, path) {
  const keys = path.split('.');
  let current = obj;
  for (const key of keys) {
    if (!current || typeof current !== 'object') return undefined;
    current = current[key];
  }
  return current;
}

// Check for RTL-breaking characters at start/end
function hasRTLIssues(str) {
  if (!str || typeof str !== 'string') return false;
  // Check for LTR marks at start that would break RTL
  if (/^\u200E/.test(str)) return true;
  // Check for misplaced LTR/RTL marks
  if (/\u200E$/.test(str)) return true;
  // Check for strings starting with parentheses without RTL override
  // This is common in Arabic strings with English abbreviations
  return false;
}

// ============================================================
// 4. MAIN AUDIT & FIX
// ============================================================

const EN_FILE = path.resolve(__dirname, '../src/locales/en/translation.json');
const AR_FILE = path.resolve(__dirname, '../src/locales/ar/translation.json');

console.log('🔍 Starting i18n Audit & Fix...\n');

// Read and parse files with dedup
const enRaw = fs.readFileSync(EN_FILE, 'utf-8');
const arRaw = fs.readFileSync(AR_FILE, 'utf-8');

const en = parseJsonDedup(enRaw);
const ar = parseJsonDedup(arRaw);

// Remove the _reload key if present
delete ar._reload;

// Get all leaf paths
const enPaths = getAllPaths(en);
const arPaths = getAllPaths(ar);

const stats = {
  missingKeys: 0,
  missingKeysTranslated: 0,
  missingKeysFallback: 0,
  emptyValues: 0,
  emptyValuesFixed: 0,
  untranslated: 0,
  untranslatedFixed: 0,
  untranslatedFallback: 0,
  placeholderMismatches: 0,
  placeholderFixed: 0,
  rtlIssues: 0,
  rtlFixed: 0,
};

const report = {
  missing: [],
  empty: [],
  untranslated: [],
  placeholderMismatches: [],
  rtlIssues: [],
};

// ---- CATEGORY 1: Missing Keys ----
console.log('📋 Category 1: Missing Keys...');
for (const [path, enValue] of Object.entries(enPaths)) {
  if (typeof enValue !== 'string') continue; // skip non-string values
  
  const arValue = getNestedValue(ar, path);
  if (arValue === undefined) {
    stats.missingKeys++;
    const translation = translateWithDict(enValue);
    if (translation) {
      setNestedValue(ar, path, translation);
      stats.missingKeysTranslated++;
    } else {
      // Use EN as fallback (better than missing)
      setNestedValue(ar, path, enValue);
      stats.missingKeysFallback++;
      report.missing.push({ path, enValue });
    }
  }
}

// ---- CATEGORY 2: Empty Values ----
console.log('📋 Category 2: Empty Values...');
for (const [path, arValue] of Object.entries(arPaths)) {
  if (arValue === '' || (typeof arValue === 'string' && arValue.trim() === '')) {
    stats.emptyValues++;
    const enValue = enPaths[path];
    if (enValue && typeof enValue === 'string') {
      const translation = translateWithDict(enValue);
      if (translation) {
        setNestedValue(ar, path, translation);
        stats.emptyValuesFixed++;
      } else {
        setNestedValue(ar, path, enValue); // fallback to EN
        report.empty.push({ path, enValue });
      }
    }
  }
}

// ---- CATEGORY 3: Untranslated Values ----
console.log('📋 Category 3: Untranslated Values...');
for (const [path, arValue] of Object.entries(getAllPaths(ar))) {
  if (typeof arValue !== 'string') continue;
  if (arValue === '') continue; // already handled
  
  const enValue = enPaths[path];
  if (!enValue || typeof enValue !== 'string') continue;
  
  // Skip if AR and EN are the same AND the value is English
  if (arValue === enValue && isEnglishOnly(arValue)) {
    stats.untranslated++;
    const translation = translateWithDict(enValue);
    if (translation) {
      setNestedValue(ar, path, translation);
      stats.untranslatedFixed++;
    } else {
      stats.untranslatedFallback++;
      report.untranslated.push({ path, enValue });
    }
  }
  // Also catch values that are purely English but differ slightly from EN
  else if (isEnglishOnly(arValue) && !containsArabic(arValue) && arValue.length > 3) {
    // Check it's not a technical term (GPS, QR, PDF, etc.)
    const techTerms = /^(GPS|QR|PDF|CSV|URL|API|IP|ID|SLA|HSSE|CCTV|PTZ|PPE|ERP|PTW|SOP|TCO|OTP|MFA|PWA|HTML|JSON|Code \d+|v\d|e\.g\.|http|www|[A-Z]{2,5})$/;
    if (!techTerms.test(arValue.trim())) {
      stats.untranslated++;
      const translation = translateWithDict(arValue);
      if (translation) {
        setNestedValue(ar, path, translation);
        stats.untranslatedFixed++;
      } else {
        stats.untranslatedFallback++;
        report.untranslated.push({ path, enValue: arValue });
      }
    }
  }
}

// ---- CATEGORY 4: Placeholder Integrity ----
console.log('📋 Category 4: Placeholder Integrity...');
const updatedArPaths = getAllPaths(ar);
for (const [path, arValue] of Object.entries(updatedArPaths)) {
  if (typeof arValue !== 'string') continue;
  const enValue = enPaths[path];
  if (!enValue || typeof enValue !== 'string') continue;
  
  const enPlaceholders = extractPlaceholders(enValue);
  const arPlaceholders = extractPlaceholders(arValue);
  
  if (enPlaceholders.length === 0 && arPlaceholders.length === 0) continue;
  
  // Check for mismatches
  const enSet = new Set(enPlaceholders);
  const arSet = new Set(arPlaceholders);
  
  const missingInAr = [...enSet].filter(p => !arSet.has(p));
  const extraInAr = [...arSet].filter(p => !enSet.has(p));
  
  if (missingInAr.length > 0 || extraInAr.length > 0) {
    stats.placeholderMismatches++;
    
    // If AR has wrong placeholder names, try to fix
    if (missingInAr.length > 0 && extraInAr.length > 0 && missingInAr.length === extraInAr.length) {
      // Simple case: rename placeholders
      let fixed = arValue;
      for (let j = 0; j < extraInAr.length; j++) {
        fixed = fixed.replace(extraInAr[j], missingInAr[j]);
      }
      setNestedValue(ar, path, fixed);
      stats.placeholderFixed++;
    } else if (missingInAr.length > 0) {
      // AR is missing placeholders - likely a translation that dropped them
      report.placeholderMismatches.push({ 
        path, 
        enPlaceholders: enPlaceholders.join(', '),
        arPlaceholders: arPlaceholders.join(', '),
        missing: missingInAr.join(', '),
        extra: extraInAr.join(', ')
      });
    }
  }
}

// ---- CATEGORY 5: RTL Check ----
console.log('📋 Category 5: RTL Check...');
const finalArPaths = getAllPaths(ar);
for (const [path, arValue] of Object.entries(finalArPaths)) {
  if (typeof arValue !== 'string') continue;
  if (!containsArabic(arValue)) continue;
  
  if (hasRTLIssues(arValue)) {
    stats.rtlIssues++;
    // Fix by removing problematic marks
    let fixed = arValue.replace(/^\u200E/, '').replace(/\u200E$/, '');
    setNestedValue(ar, path, fixed);
    stats.rtlFixed++;
    report.rtlIssues.push({ path, original: arValue });
  }
}

// ============================================================
// 5. WRITE FIXED FILE
// ============================================================
console.log('\n💾 Writing fixed ar/translation.json...');
fs.writeFileSync(AR_FILE, JSON.stringify(ar, null, 2) + '\n', 'utf-8');

// ============================================================
// 6. PRINT REPORT
// ============================================================
console.log('\n' + '='.repeat(60));
console.log('  📊 i18n AUDIT REPORT');
console.log('='.repeat(60));

console.log(`\n📋 CATEGORY 1 — Missing Keys:`);
console.log(`   Total missing: ${stats.missingKeys}`);
console.log(`   ✅ Auto-translated: ${stats.missingKeysTranslated}`);
console.log(`   ⚠️  EN fallback (needs manual translation): ${stats.missingKeysFallback}`);

console.log(`\n📋 CATEGORY 2 — Empty Values:`);
console.log(`   Total empty: ${stats.emptyValues}`);
console.log(`   ✅ Auto-fixed: ${stats.emptyValuesFixed}`);

console.log(`\n📋 CATEGORY 3 — Untranslated Values (English in AR):`);
console.log(`   Total untranslated: ${stats.untranslated}`);
console.log(`   ✅ Auto-translated: ${stats.untranslatedFixed}`);
console.log(`   ⚠️  Needs manual translation: ${stats.untranslatedFallback}`);

console.log(`\n📋 CATEGORY 4 — Placeholder Integrity:`);
console.log(`   Mismatches found: ${stats.placeholderMismatches}`);
console.log(`   ✅ Auto-fixed: ${stats.placeholderFixed}`);
console.log(`   ⚠️  Needs manual fix: ${report.placeholderMismatches.length}`);

console.log(`\n📋 CATEGORY 5 — RTL Issues:`);
console.log(`   Issues found: ${stats.rtlIssues}`);
console.log(`   ✅ Auto-fixed: ${stats.rtlFixed}`);

const totalFixed = stats.missingKeysTranslated + stats.emptyValuesFixed + 
  stats.untranslatedFixed + stats.placeholderFixed + stats.rtlFixed;
const totalRemaining = stats.missingKeysFallback + stats.untranslatedFallback + 
  report.placeholderMismatches.length;

console.log(`\n${'='.repeat(60)}`);
console.log(`  ✅ TOTAL AUTO-FIXED: ${totalFixed} keys`);
console.log(`  ⚠️  NEEDS MANUAL REVIEW: ${totalRemaining} keys`);
console.log(`${'='.repeat(60)}`);

// Write detailed report
if (totalRemaining > 0) {
  const reportPath = path.resolve(__dirname, '../I18N_MANUAL_REVIEW.md');
  let md = '# i18n Manual Review Required\n\n';
  md += `Generated: ${new Date().toISOString()}\n\n`;
  md += `Total keys needing manual translation: ${totalRemaining}\n\n`;
  
  if (report.missing.length > 0) {
    md += '## Missing Keys (EN fallback used)\n\n';
    md += '| Path | English Value |\n|------|---------------|\n';
    for (const { path, enValue } of report.missing.slice(0, 100)) {
      md += `| \`${path}\` | ${enValue.substring(0, 80)} |\n`;
    }
    if (report.missing.length > 100) md += `\n... and ${report.missing.length - 100} more\n`;
    md += '\n';
  }
  
  if (report.untranslated.length > 0) {
    md += '## Untranslated Values (Still in English)\n\n';
    md += '| Path | English Value |\n|------|---------------|\n';
    for (const { path, enValue } of report.untranslated.slice(0, 100)) {
      md += `| \`${path}\` | ${enValue.substring(0, 80)} |\n`;
    }
    if (report.untranslated.length > 100) md += `\n... and ${report.untranslated.length - 100} more\n`;
    md += '\n';
  }
  
  if (report.placeholderMismatches.length > 0) {
    md += '## Placeholder Mismatches\n\n';
    md += '| Path | EN Placeholders | AR Placeholders | Missing | Extra |\n|------|-----------------|-----------------|---------|-------|\n';
    for (const item of report.placeholderMismatches) {
      md += `| \`${item.path}\` | ${item.enPlaceholders} | ${item.arPlaceholders} | ${item.missing} | ${item.extra} |\n`;
    }
    md += '\n';
  }
  
  fs.writeFileSync(reportPath, md, 'utf-8');
  console.log(`\n📄 Detailed review report: I18N_MANUAL_REVIEW.md`);
}

console.log('\n✅ Done!\n');
