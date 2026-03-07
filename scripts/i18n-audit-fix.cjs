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
  // ===== Common UI =====
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
  "Closed": "مغلق", "Resolved": "تم الحل",
  "Copy": "نسخ", "Undo": "تراجع", "Retry": "إعادة المحاولة",
  "Light": "فاتح", "Dark": "داكن", "System": "النظام",
  "Toggle theme": "تبديل السمة", "Change language": "تغيير اللغة",
  "Select All": "تحديد الكل", "Clear All": "مسح الكل",
  "No data available": "لا تتوفر بيانات", "No results found": "لم يتم العثور على نتائج",
  "Unknown": "غير معروف", "Not Set": "غير محدد",
  "Apply": "تطبيق", "Discard": "تجاهل", "Preview": "معاينة",
  "Manage": "إدارة", "Configure": "تكوين", "Customize": "تخصيص",
  "Enable": "تفعيل", "Disable": "تعطيل", "Activate": "تنشيط", "Deactivate": "إلغاء التنشيط",
  "Show": "إظهار", "Hide": "إخفاء", "Minimize": "تصغير", "Maximize": "تكبير",
  "Pin": "تثبيت", "Unpin": "إلغاء التثبيت",
  "Lock": "قفل", "Unlock": "فتح القفل",
  "Archive": "أرشفة", "Unarchive": "إلغاء الأرشفة",
  "Duplicate": "تكرار", "Clone": "استنساخ",
  "Move": "نقل", "Sort": "ترتيب", "Group": "تجميع",
  "Merge": "دمج", "Split": "تقسيم",
  "Send": "إرسال", "Receive": "استقبال", "Share": "مشاركة",
  "Accept": "قبول", "Decline": "رفض",
  "Connect": "اتصال", "Disconnect": "قطع الاتصال",
  "Authorize": "تفويض", "Revoke": "إلغاء",
  "Subscribe": "اشتراك", "Unsubscribe": "إلغاء الاشتراك",
  "Bookmark": "إشارة مرجعية", "Favorite": "مفضل",
  "Tag": "وسم", "Label": "تسمية",
  "Navigate": "تنقل", "Browse": "تصفح",
  "Scan": "مسح", "Detect": "كشف", "Identify": "تحديد",
  "Calculate": "حساب", "Estimate": "تقدير",
  "Analyze": "تحليل", "Compare": "مقارنة", "Evaluate": "تقييم",
  "Monitor": "مراقبة", "Track": "تتبع", "Watch": "مشاهدة",
  "Log": "سجل", "Record": "تسجيل", "Capture": "التقاط",
  "Notify": "إشعار", "Remind": "تذكير", "Alert": "تنبيه",
  "Proceed": "متابعة", "Skip": "تخطي", "Ignore": "تجاهل",
  "Try Again": "إعادة المحاولة", "Go Back": "العودة",
  "Learn More": "اعرف المزيد", "Read More": "اقرأ المزيد",
  "See More": "عرض المزيد", "See All": "عرض الكل",
  "Load More": "تحميل المزيد",

  // ===== Auth & User Management =====
  "Sign In": "تسجيل الدخول", "Sign Out": "تسجيل الخروج", "Log out": "تسجيل الخروج",
  "Sign Up": "إنشاء حساب", "Email": "البريد الإلكتروني", "Password": "كلمة المرور",
  "Forgot password?": "نسيت كلمة المرور؟", "Welcome Back": "مرحباً بعودتك",
  "Create Account": "إنشاء حساب", "Confirm Password": "تأكيد كلمة المرور",
  "Login": "تسجيل الدخول", "Logout": "تسجيل الخروج", "Register": "تسجيل",
  "Authentication": "المصادقة", "Two-Factor": "المصادقة الثنائية",
  "Verification": "التحقق", "Verify Email": "تحقق من البريد الإلكتروني",
  "Reset Password": "إعادة تعيين كلمة المرور", "Change Password": "تغيير كلمة المرور",
  "New Password": "كلمة المرور الجديدة", "Current Password": "كلمة المرور الحالية",
  "Username": "اسم المستخدم", "Full Name": "الاسم الكامل",
  "First Name": "الاسم الأول", "Last Name": "اسم العائلة",
  "Phone Number": "رقم الهاتف", "Mobile Number": "رقم الجوال",
  "Remember me": "تذكرني", "Stay signed in": "البقاء متصلاً",
  "Account": "الحساب", "My Account": "حسابي",
  "Session": "الجلسة", "Sessions": "الجلسات",
  "Invitation": "دعوة", "Invite": "دعوة", "Invited": "تمت الدعوة",
  "Invite User": "دعوة مستخدم", "Invite Users": "دعوة مستخدمين",
  "Resend Invitation": "إعادة إرسال الدعوة",
  "Passkey": "مفتاح المرور", "Passkeys": "مفاتيح المرور",
  "Biometric": "البصمة", "Fingerprint": "بصمة الإصبع",
  "Face ID": "معرف الوجه", "Touch ID": "معرف اللمس",
  "OTP": "OTP", "One-Time Password": "كلمة المرور لمرة واحدة",
  "MFA": "MFA", "Multi-Factor Authentication": "المصادقة متعددة العوامل",
  "Token": "رمز", "Access Token": "رمز الوصول",
  "API Key": "مفتاح API", "Secret Key": "المفتاح السري",
  "Tenant": "المستأجر", "Tenants": "المستأجرون",
  "Subscription": "الاشتراك", "Plan": "الخطة", "Plans": "الخطط",
  "Free": "مجاني", "Basic": "أساسي", "Premium": "مميز", "Enterprise": "المؤسسات",
  "Trial": "تجريبي", "Upgrade": "ترقية", "Downgrade": "تخفيض",
  "Billing": "الفوترة", "Invoice": "فاتورة", "Payment": "الدفع",
  "Licensed Users": "المستخدمون المرخصون", "Quota": "الحصة",
  "Usage": "الاستخدام", "Limit": "الحد",
  "Admin": "المسؤول", "Super Admin": "المسؤول الأعلى",
  "Administrator": "المسؤول", "Moderator": "المشرف",
  "Owner": "المالك", "Member": "العضو", "Guest": "الضيف",

  // ===== HSSE Core Terms =====
  "Incident": "حادث", "Incidents": "الحوادث", "Observation": "ملاحظة",
  "Observations": "الملاحظات", "Investigation": "تحقيق", "Investigations": "التحقيقات",
  "Corrective Action": "إجراء تصحيحي", "Corrective Actions": "الإجراءات التصحيحية",
  "Risk Assessment": "تقييم المخاطر", "Risk Assessments": "تقييمات المخاطر",
  "Safety": "السلامة", "Security": "الأمن", "Health": "الصحة", "Environment": "البيئة",
  "Hazard": "خطر", "Hazards": "الأخطار", "Risk": "المخاطر", "Risks": "المخاطر",
  "Near Miss": "حادثة وشيكة", "Near Misses": "حوادث وشيكة",
  "Injury": "إصابة", "Injuries": "الإصابات",
  "Fatality": "وفاة", "Fatalities": "الوفيات",
  "First Aid": "إسعافات أولية", "Medical Treatment": "علاج طبي",
  "Lost Time": "وقت مفقود", "Lost Time Injury": "إصابة بوقت مفقود",
  "Recordable": "قابل للتسجيل", "Non-Recordable": "غير قابل للتسجيل",
  "Property Damage": "أضرار بالممتلكات",
  "Environmental Impact": "أثر بيئي", "Environmental Incident": "حادث بيئي",
  "Damage": "ضرر", "Fire": "حريق", "Emergency": "طوارئ",
  "Patrol": "دورية", "Patrols": "الدوريات",
  "Inspection": "فحص", "Inspections": "عمليات الفحص",
  "Audit": "تدقيق", "Audits": "عمليات التدقيق",
  "Compliance": "الامتثال", "Non-Compliance": "عدم الامتثال",
  "Severity": "الخطورة", "Low": "منخفض", "Medium": "متوسط",
  "High": "عالي", "Critical": "حرج", "Extreme": "شديد",
  "Minor": "طفيف", "Major": "كبير", "Significant": "ملحوظ",
  "Catastrophic": "كارثي", "Negligible": "ضئيل",
  "Likelihood": "الاحتمالية", "Probability": "الاحتمال",
  "Consequence": "العاقبة", "Impact": "الأثر",
  "Exposure": "التعرض", "Vulnerability": "الضعف",
  "Mitigation": "التخفيف", "Prevention": "الوقاية",
  "Elimination": "الإزالة", "Substitution": "الاستبدال",
  "Engineering Controls": "ضوابط هندسية",
  "Administrative Controls": "ضوابط إدارية",
  "PPE": "PPE", "Personal Protective Equipment": "معدات الحماية الشخصية",
  "Hierarchy of Controls": "تسلسل الضوابط",
  "Root Cause": "السبب الجذري", "Root Cause Analysis": "تحليل السبب الجذري",
  "Contributing Factor": "عامل مساهم", "Contributing Factors": "العوامل المساهمة",
  "Immediate Cause": "السبب المباشر", "Underlying Cause": "السبب الكامن",
  "Witness": "شاهد", "Witnesses": "الشهود",
  "Witness Statement": "إفادة الشاهد", "Witness Statements": "إفادات الشهود",
  "Evidence": "الأدلة", "Attachment": "مرفق", "Attachments": "المرفقات",
  "Timeline": "الجدول الزمني", "Chronology": "التسلسل الزمني",
  "Findings": "النتائج", "Conclusion": "الخلاصة", "Conclusions": "الخلاصات",
  "Lessons Learned": "الدروس المستفادة",
  "Preventive Action": "إجراء وقائي", "Preventive Actions": "الإجراءات الوقائية",
  "Follow Up": "متابعة", "Follow-Up": "متابعة",
  "Closure": "إغلاق", "Final Closure": "الإغلاق النهائي",
  "Reopen": "إعادة فتح", "Reopened": "تمت إعادة الفتح",
  "Positive Observation": "ملاحظة إيجابية", "Positive Observations": "ملاحظات إيجابية",
  "Unsafe Act": "تصرف غير آمن", "Unsafe Condition": "حالة غير آمنة",
  "Safe Behavior": "سلوك آمن", "At-Risk Behavior": "سلوك محفوف بالمخاطر",
  "Housekeeping": "النظافة والترتيب", "Ergonomics": "الهندسة البشرية",
  "Slip": "انزلاق", "Trip": "تعثر", "Fall": "سقوط",
  "Fall from Height": "سقوط من ارتفاع",
  "Struck By": "ارتطام بـ", "Caught In": "الانحشار في",
  "Electrical": "كهربائي", "Chemical": "كيميائي", "Biological": "بيولوجي",
  "Radiation": "إشعاع", "Noise": "ضوضاء", "Vibration": "اهتزاز",
  "Heat Stress": "الإجهاد الحراري", "Cold Stress": "الإجهاد البارد",
  "Confined Space": "مكان محصور", "Working at Height": "العمل على ارتفاع",
  "Hot Work": "الأعمال الساخنة", "Excavation": "الحفر",
  "Lifting": "الرفع", "Crane": "رافعة", "Scaffold": "سقالة",
  "Spill": "تسرب", "Leak": "تسريب", "Release": "انبعاث",
  "Contamination": "تلوث", "Contaminant": "ملوث",
  "Remediation": "معالجة", "Cleanup": "تنظيف",
  "Waste": "نفايات", "Waste Management": "إدارة النفايات",
  "Emission": "انبعاث", "Emissions": "الانبعاثات",
  "Effluent": "مخلفات سائلة", "Discharge": "تصريف",
  "Permit to Work": "تصريح العمل", "Work Permit": "تصريح عمل",
  "PTW": "PTW", "SOP": "SOP",
  "Standard Operating Procedure": "إجراء التشغيل القياسي",
  "Job Safety Analysis": "تحليل سلامة العمل",
  "JSA": "JSA", "JHA": "JHA",
  "Toolbox Talk": "حديث صندوق الأدوات",
  "Safety Briefing": "إحاطة السلامة",
  "Safety Meeting": "اجتماع السلامة",
  "Safety Culture": "ثقافة السلامة",
  "Safety Performance": "أداء السلامة",
  "Leading Indicator": "مؤشر استباقي", "Leading Indicators": "المؤشرات الاستباقية",
  "Lagging Indicator": "مؤشر تابع", "Lagging Indicators": "المؤشرات التابعة",
  "KPI": "مؤشر الأداء", "KPIs": "مؤشرات الأداء",
  "TRIR": "TRIR", "LTIR": "LTIR", "DART": "DART",
  "Man-Hours": "ساعات العمل", "Safe Man-Hours": "ساعات العمل الآمنة",
  "Days Without Incident": "أيام بدون حوادث",
  "Safety Pyramid": "هرم السلامة",
  "Heinrich Triangle": "مثلث هاينريش",

  // ===== Investigation & Workflow =====
  "Submitted": "تم الإرسال", "Under Review": "قيد المراجعة",
  "Pending Approval": "في انتظار الموافقة", "Awaiting Assignment": "في انتظار التعيين",
  "Expert Screening": "فحص الخبير", "Manager Review": "مراجعة المدير",
  "HSSE Validation": "تحقق HSSE", "Under Investigation": "قيد التحقيق",
  "Investigation Complete": "اكتمل التحقيق",
  "Pending Closure": "في انتظار الإغلاق",
  "Dispute": "نزاع", "Dispute Open": "نزاع مفتوح",
  "Dispute Resolution": "حل النزاع",
  "Workflow": "سير العمل", "Workflow Status": "حالة سير العمل",
  "Current Owner": "المسؤول الحالي", "Current Step": "الخطوة الحالية",
  "Next Step": "الخطوة التالية", "Previous Step": "الخطوة السابقة",
  "Transition": "انتقال", "History": "السجل",
  "Approval History": "سجل الموافقات",
  "Screening": "فحص", "Triage": "فرز",
  "Classify": "تصنيف", "Classification": "التصنيف",
  "Categorize": "تصنيف فرعي", "Categorization": "التصنيف الفرعي",
  "Department Representative": "ممثل القسم",
  "HSSE Expert": "خبير السلامة والصحة والأمن والبيئة",
  "HSSE Manager": "مدير السلامة والصحة والأمن والبيئة",
  "HSSE Officer": "مسؤول السلامة والصحة والأمن والبيئة",
  "Site Client": "عميل الموقع",
  "Contractor Consultant": "استشاري المقاول",
  "Investigator": "المحقق", "Lead Investigator": "المحقق الرئيسي",
  "Investigation Team": "فريق التحقيق",
  "Escalation": "التصعيد", "Escalated": "تم التصعيد",
  "Delegation": "التفويض", "Delegated": "تم التفويض",
  "Reminder": "تذكير", "Send Reminder": "إرسال تذكير",
  "Take Action": "اتخاذ إجراء",
  "Approve All": "الموافقة على الكل", "Reject All": "رفض الكل",
  "Bulk Approve": "موافقة جماعية", "Bulk Reject": "رفض جماعي",
  "Bulk Actions": "إجراءات جماعية", "Bulk Action": "إجراء جماعي",
  "Select Items": "حدد العناصر",
  "Action Required": "إجراء مطلوب", "No Action Required": "لا إجراء مطلوب",
  "Pending Actions": "إجراءات معلقة",
  "Extension Request": "طلب تمديد", "Extension": "تمديد",
  "Request Extension": "طلب تمديد", "Approve Extension": "الموافقة على التمديد",
  "Deny Extension": "رفض التمديد",
  "SLA": "SLA", "Service Level Agreement": "اتفاقية مستوى الخدمة",
  "Overdue Actions": "إجراءات متأخرة",
  "Coming Due": "قارب الاستحقاق",
  "On Schedule": "في الموعد",
  "Behind Schedule": "متأخر عن الموعد",
  "Ahead of Schedule": "متقدم عن الموعد",

  // ===== Security & Guards =====
  "Guard": "حارس", "Guards": "الحراس",
  "Visitor": "زائر", "Visitors": "الزوار",
  "Contractor": "مقاول", "Contractors": "المقاولون",
  "Worker": "عامل", "Workers": "العمال",
  "Gate": "بوابة", "Gates": "البوابات",
  "Checkpoint": "نقطة تفتيش", "Checkpoints": "نقاط التفتيش",
  "Zone": "منطقة", "Zones": "المناطق",
  "Shift": "وردية", "Shifts": "الورديات",
  "Roster": "جدول المناوبات",
  "Access Denied": "تم رفض الوصول", "Access Granted": "تم منح الوصول",
  "Entry": "دخول", "Exit": "خروج", "On Site": "في الموقع",
  "Check In": "تسجيل الدخول", "Check Out": "تسجيل الخروج",
  "Checked In": "تم تسجيل الدخول", "Checked Out": "تم تسجيل الخروج",
  "Gate Pass": "تصريح دخول", "Gate Passes": "تصاريح الدخول",
  "Material Gate Pass": "تصريح دخول مواد",
  "Security Incident": "حادث أمني",
  "Security Alert": "تنبيه أمني", "Security Alerts": "التنبيهات الأمنية",
  "Intruder": "متسلل", "Intrusion": "اقتحام",
  "Surveillance": "المراقبة", "CCTV": "CCTV",
  "Camera": "الكاميرا", "Cameras": "الكاميرات",
  "Alarm": "إنذار", "Alarms": "الإنذارات",
  "Perimeter": "المحيط", "Fence": "السياج",
  "Geofence": "نطاق جغرافي", "Geofencing": "تحديد النطاق الجغرافي",
  "Boundary": "الحدود", "Boundaries": "الحدود",
  "Command Center": "مركز القيادة",
  "Control Room": "غرفة التحكم",
  "Duty Officer": "ضابط المناوبة",
  "Night Shift": "وردية ليلية", "Day Shift": "وردية نهارية",
  "Morning Shift": "وردية صباحية",
  "Handover": "تسليم", "Shift Handover": "تسليم الوردية",
  "Incident Report": "تقرير الحادث",
  "Daily Report": "التقرير اليومي",
  "Patrol Route": "مسار الدورية", "Patrol Routes": "مسارات الدوريات",
  "Patrol Session": "جلسة دورية",
  "Start Patrol": "بدء الدورية", "End Patrol": "إنهاء الدورية",
  "QR Code": "رمز QR", "QR Scanner": "ماسح QR",
  "Scan QR": "مسح رمز QR", "Scan Code": "مسح الرمز",
  "Barcode": "باركود", "Badge": "شارة", "Badges": "الشارات",
  "ID Card": "بطاقة الهوية", "Access Card": "بطاقة الدخول",
  "Blacklist": "القائمة السوداء", "Blacklisted": "محظور",
  "Whitelist": "القائمة البيضاء", "Whitelisted": "مسموح",
  "Banned": "محظور", "Suspended": "معلّق",
  "Verification": "التحقق", "Identity Verification": "التحقق من الهوية",
  "Facial Recognition": "التعرف على الوجه",
  "Fingerprint": "بصمة الإصبع",
  "Access Level": "مستوى الوصول", "Access Levels": "مستويات الوصول",
  "Restricted Area": "منطقة محظورة", "Restricted": "محظور",
  "Authorized": "مصرح", "Unauthorized": "غير مصرح",
  "Escort Required": "يتطلب مرافقة", "Escort": "مرافقة",
  "Vehicle": "مركبة", "Vehicles": "المركبات",
  "License Plate": "لوحة الترخيص", "Vehicle Registration": "تسجيل المركبة",
  "Parking": "موقف السيارات",
  "Emergency Contact": "جهة اتصال الطوارئ",
  "Emergency Contacts": "جهات اتصال الطوارئ",
  "Evacuation": "إخلاء", "Muster Point": "نقطة التجمع",
  "Assembly Point": "نقطة التجمع",
  "Lockdown": "إغلاق كامل",
  "All Clear": "كل شيء آمن",

  // ===== Contractors & Workers =====
  "Contractor Company": "شركة المقاول",
  "Contractor Companies": "شركات المقاولين",
  "Contractor Worker": "عامل مقاول",
  "Contractor Workers": "عمال المقاولين",
  "Subcontractor": "مقاول من الباطن",
  "Induction": "التعريف", "Inductions": "جلسات التعريف",
  "Safety Induction": "تعريف السلامة",
  "Site Induction": "تعريف الموقع",
  "Induction Video": "فيديو التعريف",
  "Trade": "المهنة", "Trades": "المهن",
  "Qualification": "المؤهل", "Qualifications": "المؤهلات",
  "Certification": "الشهادة", "Certifications": "الشهادات",
  "Expiry": "انتهاء الصلاحية", "Expiry Date": "تاريخ الانتهاء",
  "Valid Until": "صالح حتى", "Valid From": "صالح من",
  "Renewal": "التجديد", "Renew": "تجديد",
  "Worker ID": "رقم العامل", "Employee ID": "رقم الموظف",
  "National ID": "رقم الهوية الوطنية", "Iqama": "الإقامة",
  "Iqama Number": "رقم الإقامة",
  "Passport": "جواز السفر", "Passport Number": "رقم جواز السفر",
  "Work Visa": "تأشيرة العمل",
  "Labor Card": "بطاقة العمل",
  "Insurance": "التأمين", "Insurance Policy": "وثيقة التأمين",
  "Medical Certificate": "شهادة طبية",
  "Medical Examination": "الفحص الطبي",
  "Fit to Work": "لائق للعمل", "Unfit to Work": "غير لائق للعمل",
  "Training Record": "سجل التدريب",
  "Training Records": "سجلات التدريب",
  "Competency": "الكفاءة", "Competencies": "الكفاءات",
  "Violation": "مخالفة", "Violations": "المخالفات",
  "Violation Type": "نوع المخالفة",
  "Penalty": "عقوبة", "Penalties": "العقوبات",
  "Fine": "غرامة", "Fines": "الغرامات",
  "Warning Letter": "خطاب تحذير",
  "Stop Work Order": "أمر إيقاف العمل",
  "Work Order": "أمر عمل", "Work Orders": "أوامر العمل",
  "Contract": "العقد", "Contracts": "العقود",
  "Contract Number": "رقم العقد",
  "Contract Value": "قيمة العقد",
  "Start Date": "تاريخ البدء", "End Date": "تاريخ الانتهاء",
  "Scope of Work": "نطاق العمل",
  "Bill of Quantities": "جدول الكميات",
  "Change Order": "أمر تغيير",
  "Mobilization": "التعبئة", "Demobilization": "التسريح",
  "Manpower": "القوى العاملة", "Headcount": "عدد الموظفين",
  "Daily Headcount": "العدد اليومي",

  // ===== Assets =====
  "Asset": "أصل", "Assets": "الأصول", "Asset Management": "إدارة الأصول",
  "Maintenance": "الصيانة", "Warranty": "الضمان", "Depreciation": "الإهلاك",
  "Transfer": "تحويل", "Disposal": "إتلاف",
  "Preventive Maintenance": "صيانة وقائية",
  "Corrective Maintenance": "صيانة تصحيحية",
  "Predictive Maintenance": "صيانة تنبؤية",
  "Breakdown": "عطل", "Breakdowns": "الأعطال",
  "Downtime": "وقت التوقف", "Uptime": "وقت التشغيل",
  "Availability": "التوفر", "Reliability": "الموثوقية",
  "Mean Time Between Failures": "متوسط الوقت بين الأعطال",
  "MTBF": "MTBF", "MTTR": "MTTR",
  "Mean Time To Repair": "متوسط وقت الإصلاح",
  "Total Cost of Ownership": "التكلفة الإجمالية للملكية",
  "TCO": "TCO",
  "Acquisition Cost": "تكلفة الاقتناء",
  "Operating Cost": "تكلفة التشغيل",
  "Maintenance Cost": "تكلفة الصيانة",
  "Replacement Cost": "تكلفة الاستبدال",
  "Book Value": "القيمة الدفترية",
  "Salvage Value": "قيمة الإنقاذ", "Residual Value": "القيمة المتبقية",
  "Useful Life": "العمر الافتراضي",
  "Service Life": "عمر الخدمة",
  "Condition": "الحالة", "Condition Assessment": "تقييم الحالة",
  "Health Score": "درجة الصحة", "Health": "الصحة",
  "Failure Prediction": "توقع العطل",
  "Predictive": "تنبؤي", "Prediction": "التنبؤ",
  "Spare Parts": "قطع الغيار", "Parts": "القطع",
  "Part Number": "رقم القطعة", "Part Name": "اسم القطعة",
  "Stock": "المخزون", "Stock Level": "مستوى المخزون",
  "Reorder Level": "مستوى إعادة الطلب",
  "Reorder Point": "نقطة إعادة الطلب",
  "Minimum Stock": "الحد الأدنى للمخزون",
  "Maximum Stock": "الحد الأقصى للمخزون",
  "In Stock": "متوفر", "Out of Stock": "غير متوفر",
  "Low Stock": "مخزون منخفض",
  "Serial Number": "الرقم التسلسلي",
  "Model": "الطراز", "Manufacturer": "الشركة المصنعة",
  "Make": "الشركة المصنعة",
  "Year": "السنة", "Year of Manufacture": "سنة الصنع",
  "Installation Date": "تاريخ التركيب",
  "Commission Date": "تاريخ التشغيل",
  "Decommission": "إيقاف التشغيل",
  "Barcode": "باركود", "Asset Tag": "ملصق الأصل",
  "QR Code": "رمز QR",
  "Location": "الموقع", "Sub-Location": "الموقع الفرعي",
  "Floor": "الطابق", "Room": "الغرفة",
  "Assigned To": "معيّن إلى",
  "Custodian": "الأمين", "Responsible Person": "الشخص المسؤول",
  "Calibration": "المعايرة", "Calibration Due": "موعد المعايرة",
  "Last Calibrated": "آخر معايرة",
  "Sensor": "مستشعر", "Sensors": "المستشعرات",
  "Reading": "قراءة", "Readings": "القراءات",
  "Meter": "عداد", "Meter Reading": "قراءة العداد",
  "Operating Hours": "ساعات التشغيل",
  "Mileage": "عدد الأميال",
  "Fuel": "الوقود", "Fuel Consumption": "استهلاك الوقود",

  // ===== Inspections =====
  "Inspection Template": "نموذج الفحص",
  "Inspection Templates": "نماذج الفحص",
  "Template": "نموذج", "Templates": "النماذج",
  "Checklist": "قائمة الفحص", "Checklists": "قوائم الفحص",
  "Checklist Item": "عنصر قائمة الفحص",
  "Question": "سؤال", "Questions": "الأسئلة",
  "Answer": "إجابة", "Answers": "الإجابات",
  "Response": "استجابة", "Responses": "الاستجابات",
  "Compliant": "مطابق", "Non-Compliant": "غير مطابق",
  "Not Applicable": "غير منطبق", "N/A": "غير منطبق",
  "Pass": "ناجح", "Fail": "فاشل",
  "Finding": "النتيجة", "Findings": "النتائج",
  "Non-Conformance": "عدم مطابقة", "Non-Conformances": "حالات عدم المطابقة",
  "Observation": "ملاحظة",
  "Recommendation": "التوصية", "Recommendations": "التوصيات",
  "Area Inspection": "فحص المنطقة",
  "Scheduled Inspection": "فحص مجدول",
  "Unscheduled Inspection": "فحص غير مجدول",
  "Routine Inspection": "فحص دوري",
  "Special Inspection": "فحص خاص",
  "Inspector": "المفتش", "Inspectors": "المفتشون",
  "Inspection Score": "درجة الفحص",
  "Overall Score": "الدرجة الإجمالية",
  "Scoring": "التسجيل", "Score Card": "بطاقة الدرجات",
  "Benchmark": "المعيار المرجعي",
  "Section": "القسم", "Sections": "الأقسام",
  "Item": "العنصر", "Items": "العناصر",
  "Weight": "الوزن", "Weighted": "مرجح",
  "Frequency": "التكرار", "Daily": "يومي", "Weekly": "أسبوعي",
  "Monthly": "شهري", "Quarterly": "ربع سنوي",
  "Semi-Annual": "نصف سنوي", "Annual": "سنوي",
  "Schedule": "جدول", "Scheduled": "مجدول",
  "Due": "مستحق", "Due Date": "تاريخ الاستحقاق",
  "Completion Date": "تاريخ الإكمال",
  "Completion Rate": "معدل الإنجاز",
  "Coverage": "التغطية", "Coverage Rate": "معدل التغطية",
  "Objective Evidence": "الدليل الموضوعي",
  "Photo Evidence": "دليل مصور",

  // ===== Dashboard & Analytics =====
  "Overview": "نظرة عامة", "Summary": "ملخص", "Total": "الإجمالي",
  "Average": "المتوسط", "Count": "العدد", "Percentage": "النسبة المئوية",
  "Chart": "رسم بياني", "Charts": "الرسوم البيانية",
  "Table": "جدول", "List": "قائمة", "Grid": "شبكة",
  "Map": "خريطة", "Calendar": "التقويم",
  "Notifications": "الإشعارات", "Alerts": "التنبيهات",
  "Configuration": "التكوين", "Preferences": "التفضيلات",
  "Help": "مساعدة", "About": "حول", "Version": "الإصدار",
  "Trend": "الاتجاه", "Trends": "الاتجاهات",
  "Growth": "النمو", "Decline": "الانخفاض",
  "Increase": "زيادة", "Decrease": "انخفاض",
  "Up": "أعلى", "Down": "أسفل",
  "Year over Year": "سنة بعد سنة", "Month over Month": "شهر بعد شهر",
  "Week over Week": "أسبوع بعد أسبوع",
  "Comparison": "المقارنة", "Benchmark": "المعيار المرجعي",
  "Target": "الهدف", "Targets": "الأهداف",
  "Actual": "الفعلي", "Planned": "المخطط",
  "Variance": "التباين", "Deviation": "الانحراف",
  "Threshold": "العتبة", "Baseline": "خط الأساس",
  "Distribution": "التوزيع", "Breakdown": "التفصيل",
  "By Category": "حسب الفئة", "By Status": "حسب الحالة",
  "By Department": "حسب القسم", "By Location": "حسب الموقع",
  "By Severity": "حسب الخطورة", "By Type": "حسب النوع",
  "By Date": "حسب التاريخ", "By Month": "حسب الشهر",
  "By Year": "حسب السنة",
  "Top": "الأعلى", "Bottom": "الأدنى",
  "Highest": "الأعلى", "Lowest": "الأدنى",
  "Best": "الأفضل", "Worst": "الأسوأ",
  "Pareto": "باريتو", "Pareto Chart": "مخطط باريتو",
  "Waterfall": "الشلال", "Waterfall Chart": "مخطط الشلال",
  "Pie Chart": "مخطط دائري", "Bar Chart": "مخطط شريطي",
  "Line Chart": "مخطط خطي", "Area Chart": "مخطط مساحي",
  "Scatter Plot": "مخطط نقطي", "Heat Map": "خريطة حرارية",
  "Funnel": "القمع", "Gauge": "المقياس",
  "Metric": "المقياس", "Metrics": "المقاييس",
  "Widget": "الأداة", "Widgets": "الأدوات",
  "Data Quality": "جودة البيانات",
  "Data Source": "مصدر البيانات",
  "Refresh Rate": "معدل التحديث",
  "Real-time": "الوقت الفعلي", "Real Time": "الوقت الفعلي",
  "Historical": "تاريخي", "Historical Data": "البيانات التاريخية",
  "Cache": "ذاكرة التخزين المؤقت", "Cached": "مخزن مؤقتاً",
  "Stale": "قديم", "Fresh": "حديث",
  "Executive Summary": "الملخص التنفيذي",
  "Executive Report": "التقرير التنفيذي",
  "Management Report": "تقرير الإدارة",
  "Monthly Report": "التقرير الشهري",
  "Weekly Report": "التقرير الأسبوعي",
  "Annual Report": "التقرير السنوي",

  // ===== Reports & Export =====
  "Report": "تقرير", "Reports": "التقارير",
  "Generate Report": "إنشاء تقرير",
  "Export to Excel": "تصدير إلى Excel",
  "Export to PDF": "تصدير إلى PDF",
  "Export to CSV": "تصدير إلى CSV",
  "Export to Word": "تصدير إلى Word",
  "Download Report": "تنزيل التقرير",
  "Print Report": "طباعة التقرير",
  "Share Report": "مشاركة التقرير",
  "Report Type": "نوع التقرير",
  "Date Range": "نطاق التاريخ",
  "Custom Range": "نطاق مخصص",
  "Last 7 Days": "آخر ٧ أيام", "Last 30 Days": "آخر ٣٠ يوم",
  "Last 90 Days": "آخر ٩٠ يوم",
  "This Week": "هذا الأسبوع", "This Month": "هذا الشهر",
  "This Quarter": "هذا الربع", "This Year": "هذه السنة",
  "Last Week": "الأسبوع الماضي", "Last Month": "الشهر الماضي",
  "Last Quarter": "الربع الماضي", "Last Year": "السنة الماضية",
  "Today": "اليوم", "Yesterday": "أمس",
  "Custom": "مخصص",
  "Filters": "المرشحات", "Applied Filters": "المرشحات المطبقة",
  "Clear Filters": "مسح المرشحات", "Reset Filters": "إعادة تعيين المرشحات",
  "No Filters": "لا توجد مرشحات",
  "Columns": "الأعمدة", "Show Columns": "إظهار الأعمدة",
  "Hide Columns": "إخفاء الأعمدة",
  "Sort By": "ترتيب حسب", "Ascending": "تصاعدي", "Descending": "تنازلي",
  "Page": "صفحة", "of": "من",
  "Rows per page": "صفوف لكل صفحة",
  "Showing": "عرض", "entries": "إدخالات",
  "First": "الأول", "Last": "الأخير",
  "Per Page": "لكل صفحة",

  // ===== Settings & Admin =====
  "General Settings": "الإعدادات العامة",
  "System Settings": "إعدادات النظام",
  "Account Settings": "إعدادات الحساب",
  "Notification Settings": "إعدادات الإشعارات",
  "Email Notifications": "إشعارات البريد الإلكتروني",
  "Push Notifications": "الإشعارات الفورية",
  "In-App Notifications": "الإشعارات داخل التطبيق",
  "Sound": "الصوت", "Vibration": "الاهتزاز",
  "Language": "اللغة", "Languages": "اللغات",
  "Theme": "السمة", "Themes": "السمات",
  "Appearance": "المظهر",
  "Branding": "العلامة التجارية",
  "Logo": "الشعار", "Favicon": "أيقونة الموقع",
  "Primary Color": "اللون الأساسي",
  "Secondary Color": "اللون الثانوي",
  "Background Color": "لون الخلفية",
  "Module": "الوحدة", "Modules": "الوحدات",
  "Module Management": "إدارة الوحدات",
  "Feature": "الميزة", "Features": "الميزات",
  "Feature Flag": "علم الميزة",
  "Integration": "التكامل", "Integrations": "التكاملات",
  "Webhook": "Webhook", "Webhooks": "Webhooks",
  "API": "API", "Endpoint": "نقطة النهاية",
  "Rate Limit": "حد المعدل",
  "Backup": "نسخة احتياطية", "Restore": "استعادة",
  "Maintenance Mode": "وضع الصيانة",
  "Data Migration": "نقل البيانات",
  "Bulk Import": "استيراد جماعي", "Bulk Export": "تصدير جماعي",
  "Template": "نموذج", "Templates": "النماذج",
  "Sample Data": "بيانات نموذجية",
  "Seed Data": "بيانات أولية",
  "Audit Log": "سجل التدقيق", "Audit Logs": "سجلات التدقيق",
  "Activity Log": "سجل النشاط", "Activity Logs": "سجلات النشاط",
  "Change Log": "سجل التغييرات",
  "User Activity": "نشاط المستخدم",
  "Login History": "سجل تسجيل الدخول",
  "User Management": "إدارة المستخدمين",
  "Role Management": "إدارة الأدوار",
  "Permission Management": "إدارة الصلاحيات",
  "Tenant Management": "إدارة المستأجرين",
  "Branch Management": "إدارة الفروع",
  "Department Management": "إدارة الأقسام",
  "Site Management": "إدارة المواقع",

  // ===== Time =====
  "hours": "ساعات", "minutes": "دقائق", "seconds": "ثواني", "days": "أيام",
  "hour": "ساعة", "minute": "دقيقة", "second": "ثانية", "day": "يوم",
  "week": "أسبوع", "month": "شهر", "year": "سنة",
  "weeks": "أسابيع", "months": "أشهر", "years": "سنوات",
  "hours ago": "منذ ساعات", "minutes ago": "منذ دقائق",
  "days ago": "منذ أيام", "Just now": "الآن",
  "ago": "منذ", "from now": "من الآن",

  // ===== Status & Progress =====
  "Verify": "تحقق", "Validate": "التحقق من صحة",
  "Assign": "تعيين", "Reassign": "إعادة تعيين",
  "Approve": "موافقة", "Reject": "رفض", "Review": "مراجعة",
  "Start": "بدء", "Stop": "إيقاف", "Pause": "إيقاف مؤقت", "Resume": "استئناف",
  "Complete": "إكمال",
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
  "Generate": "إنشاء",
  "Reported By": "أبلغ بواسطة", "Created By": "أنشأه",
  "Supervisor": "مشرف", "Manager": "مدير",
  "Team": "الفريق", "Teams": "الفرق",
  "Role": "الدور", "Roles": "الأدوار", "Permission": "الصلاحية",
  "User": "المستخدم", "Users": "المستخدمون",
  "Organization": "المنظمة", "Company": "الشركة",
  "Project": "المشروع", "Projects": "المشاريع",
  "GPS": "GPS",
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
  "Permanent": "دائم", "Temporary": "مؤقت",
  "Valid": "صالح", "Invalid": "غير صالح",
  "Expired": "منتهي الصلاحية",
  "Current": "الحالي", "New": "جديد", "Old": "قديم",
  "Before": "قبل", "After": "بعد",
  "From": "من", "To": "إلى",
  "Min": "الحد الأدنى", "Max": "الحد الأقصى",
  "Minimum": "الحد الأدنى", "Maximum": "الحد الأقصى",
  "Please wait": "يرجى الانتظار",
  "Processing...": "جاري المعالجة...",
  "Scanning...": "جاري المسح...",
  "Verifying...": "جاري التحقق...",
  "Generating...": "جاري الإنشاء...",
  "Submitting...": "جاري الإرسال...",
  "Deleting...": "جاري الحذف...",
  "Canceling...": "جاري الإلغاء...",
  "Exporting...": "جاري التصدير...",
  "Importing...": "جاري الاستيراد...",
  "Uploading...": "جاري الرفع...",
  "Downloading...": "جاري التنزيل...",
  "Analyzing...": "جاري التحليل...",
  "Calculating...": "جاري الحساب...",
  "Syncing...": "جاري المزامنة...",
  "Updating...": "جاري التحديث...",
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
  "Unit": "الوحدة",
  "Permit": "تصريح",
  "License": "رخصة",
  "Certificate": "شهادة",
  "Assigned": "معيّن",
  "Unassigned": "غير معيّن",
  "Overdue": "متأخر",
  "On Track": "في الموعد",
  "At Risk": "معرض للخطر",
  "On Time": "في الوقت المحدد",
  "Late": "متأخر",
  "Early": "مبكر",
  "Breach": "اختراق",
  "Non-compliance": "عدم الامتثال",
  "Regulation": "اللوائح",
  "Policy": "السياسة",
  "Procedure": "الإجراء",
  "Standard": "المعيار",
  "Criterion": "المعيار",
  "Not Supported": "غير مدعوم",
  "Provider": "المزود",
  "No Show": "عدم حضور",
  "record": "سجل", "records": "سجلات",
  "item": "عنصر", "items": "عناصر",
  "or": "أو", "and": "و",
  "with": "مع", "without": "بدون",
  "in": "في", "at": "في",
  "by": "بواسطة", "for": "لـ",
  "to": "إلى", "from": "من",

  // ===== Risk Assessment =====
  "Risk Matrix": "مصفوفة المخاطر",
  "Risk Register": "سجل المخاطر",
  "Risk Level": "مستوى المخاطر",
  "Risk Score": "درجة المخاطر",
  "Risk Rating": "تصنيف المخاطر",
  "Risk Owner": "مالك المخاطر",
  "Risk Category": "فئة المخاطر",
  "Residual Risk": "المخاطر المتبقية",
  "Inherent Risk": "المخاطر الكامنة",
  "Control Measure": "تدبير الرقابة",
  "Control Measures": "تدابير الرقابة",
  "Control Effectiveness": "فعالية الرقابة",
  "Risk Treatment": "معالجة المخاطر",
  "Accept": "قبول", "Avoid": "تجنب",
  "Reduce": "تقليل", "Transfer": "نقل",
  "Almost Certain": "شبه مؤكد",
  "Likely": "محتمل", "Possible": "ممكن",
  "Unlikely": "غير محتمل", "Rare": "نادر",
  "Insignificant": "غير ملحوظ",
  "Moderate": "متوسط",

  // ===== Notifications & Communication =====
  "Notification": "إشعار", "Notification Template": "نموذج الإشعار",
  "Notification Templates": "نماذج الإشعارات",
  "Email Template": "نموذج البريد الإلكتروني",
  "SMS": "رسالة نصية", "WhatsApp": "واتساب",
  "Push Notification": "إشعار فوري",
  "In-App": "داخل التطبيق",
  "Channel": "القناة", "Channels": "القنوات",
  "Recipient": "المستلم", "Recipients": "المستلمون",
  "Subject": "الموضوع", "Body": "المحتوى",
  "Template Variable": "متغير النموذج",
  "Sent": "مرسل", "Delivered": "تم التسليم",
  "Read": "مقروء", "Unread": "غير مقروء",
  "Mark as Read": "تحديد كمقروء",
  "Mark All as Read": "تحديد الكل كمقروء",
  "Clear Notifications": "مسح الإشعارات",

  // ===== AI & Analysis =====
  "AI Analysis": "التحليل بالذكاء الاصطناعي",
  "AI Suggestions": "اقتراحات الذكاء الاصطناعي",
  "AI Powered": "مدعوم بالذكاء الاصطناعي",
  "Smart Detection": "الكشف الذكي",
  "Auto Detect": "كشف تلقائي",
  "Auto Classify": "تصنيف تلقائي",
  "Confidence": "الثقة", "Confidence Level": "مستوى الثقة",
  "Accuracy": "الدقة",
  "Pattern": "نمط", "Patterns": "الأنماط",
  "Anomaly": "شذوذ", "Anomalies": "الشذوذ",
  "Suggestion": "اقتراح", "Suggestions": "الاقتراحات",
  "Insight": "رؤية", "Insights": "الرؤى",

  // ===== Misc =====
  "Quick Observation": "ملاحظة سريعة",
  "Quick Report": "تقرير سريع",
  "Quick Actions": "إجراءات سريعة",
  "Favorites": "المفضلات",
  "Recent": "الأخيرة", "Recently Added": "أضيف مؤخراً",
  "Frequently Used": "الأكثر استخداماً",
  "Pinned": "مثبت", "Starred": "مميز بنجمة",
  "Archive": "الأرشيف", "Archived": "مؤرشف",
  "Trash": "سلة المحذوفات", "Trashed": "في سلة المحذوفات",
  "Restore": "استعادة", "Recover": "استرداد",
  "Permanently Delete": "حذف نهائي",
  "Empty Trash": "تفريغ سلة المحذوفات",
  "Batch": "دفعة", "Batch Processing": "معالجة دفعية",
  "Queue": "قائمة الانتظار", "Queued": "في قائمة الانتظار",
  "Retry Failed": "إعادة المحاولة الفاشلة",
  "Color": "اللون", "Icon": "الأيقونة",
  "Image": "صورة", "Images": "الصور",
  "Thumbnail": "صورة مصغرة",
  "Avatar": "الصورة الرمزية",
  "Initials": "الأحرف الأولى",
  "Tab": "علامة تبويب", "Tabs": "علامات التبويب",
  "Panel": "لوحة", "Sidebar": "الشريط الجانبي",
  "Header": "الرأسية", "Footer": "التذييل",
  "Navigation": "التنقل", "Menu": "القائمة",
  "Breadcrumb": "مسار التنقل", "Breadcrumbs": "مسارات التنقل",
  "Step": "خطوة", "Steps": "الخطوات",
  "Progress": "التقدم", "Progress Bar": "شريط التقدم",
  "Loading Indicator": "مؤشر التحميل",
  "Spinner": "المغزل",
  "Tooltip": "تلميح", "Hint": "تلميح",
  "Placeholder": "عنصر نائب",
  "Empty State": "حالة فارغة",
  "No Items": "لا توجد عناصر",
  "No Records": "لا توجد سجلات",
  "Getting Started": "بدء الاستخدام",
  "Welcome": "مرحباً",
  "Onboarding": "التهيئة",
  "Tour": "جولة تعريفية",
  "Documentation": "التوثيق",
  "FAQ": "الأسئلة الشائعة",
  "Support": "الدعم", "Contact Support": "تواصل مع الدعم",
  "Feedback": "الملاحظات", "Send Feedback": "إرسال ملاحظات",
  "Bug Report": "تقرير خطأ",
  "Feature Request": "طلب ميزة",
  "What's New": "ما الجديد",
  "Release Notes": "ملاحظات الإصدار",
  "Changelog": "سجل التغييرات",

  // ===== Visit & Access =====
  "Visit Request": "طلب زيارة", "Visit Requests": "طلبات الزيارة",
  "Purpose of Visit": "غرض الزيارة",
  "Expected Arrival": "وقت الوصول المتوقع",
  "Expected Departure": "وقت المغادرة المتوقع",
  "Host": "المضيف", "Hosted By": "استضاف بواسطة",
  "Pre-Approved": "موافق عليه مسبقاً",
  "Walk-In": "حضور مباشر",
  "Recurring Visit": "زيارة متكررة",
  "Single Visit": "زيارة واحدة",
  "Group Visit": "زيارة جماعية",
  "VIP": "VIP", "Regular": "عادي",

  // ===== Special Events =====
  "Special Event": "حدث خاص", "Special Events": "أحداث خاصة",
  "Event": "حدث", "Events": "الأحداث",
  "Event Type": "نوع الحدث",
  "Event Date": "تاريخ الحدث",
  "Organizer": "المنظم",
  "Attendees": "الحضور", "Attendee": "حاضر",
  "Capacity": "السعة", "Max Capacity": "السعة القصوى",
  "Registration": "التسجيل",
  "Check-In": "تسجيل الوصول", "Check-Out": "تسجيل المغادرة",
};

// Sentence-level translations for common patterns
const SENTENCE_DICT = {
  // Confirmation & Deletion
  "Are you sure you want to delete": "هل أنت متأكد من الحذف",
  "This action cannot be undone": "لا يمكن التراجع عن هذا الإجراء",
  "Are you sure you want to remove": "هل أنت متأكد من الإزالة",
  "Are you sure you want to close": "هل أنت متأكد من الإغلاق",
  "Are you sure you want to reject": "هل أنت متأكد من الرفض",
  "Are you sure you want to approve": "هل أنت متأكد من الموافقة",
  "Are you sure you want to submit": "هل أنت متأكد من الإرسال",
  "Are you sure you want to cancel": "هل أنت متأكد من الإلغاء",
  "permanently deleted": "حذف نهائي",
  "will be permanently deleted": "سيتم حذفه نهائياً",
  "will be removed": "ستتم إزالته",

  // Success messages
  "successfully created": "تم الإنشاء بنجاح",
  "successfully updated": "تم التحديث بنجاح",
  "successfully deleted": "تم الحذف بنجاح",
  "successfully saved": "تم الحفظ بنجاح",
  "successfully submitted": "تم الإرسال بنجاح",
  "successfully approved": "تمت الموافقة بنجاح",
  "successfully rejected": "تم الرفض بنجاح",
  "successfully assigned": "تم التعيين بنجاح",
  "successfully closed": "تم الإغلاق بنجاح",
  "successfully exported": "تم التصدير بنجاح",
  "successfully imported": "تم الاستيراد بنجاح",
  "successfully uploaded": "تم الرفع بنجاح",
  "successfully sent": "تم الإرسال بنجاح",
  "has been created": "تم إنشاؤه",
  "has been updated": "تم تحديثه",
  "has been deleted": "تم حذفه",
  "has been saved": "تم حفظه",
  "has been submitted": "تم إرساله",
  "has been approved": "تمت الموافقة عليه",
  "has been rejected": "تم رفضه",
  "has been assigned": "تم تعيينه",
  "has been closed": "تم إغلاقه",

  // Failure messages
  "Failed to load": "فشل في التحميل",
  "Failed to save": "فشل في الحفظ",
  "Failed to delete": "فشل في الحذف",
  "Failed to create": "فشل في الإنشاء",
  "Failed to update": "فشل في التحديث",
  "Failed to submit": "فشل في الإرسال",
  "Failed to upload": "فشل في الرفع",
  "Failed to export": "فشل في التصدير",
  "Failed to import": "فشل في الاستيراد",
  "Failed to send": "فشل في الإرسال",
  "Failed to connect": "فشل في الاتصال",
  "Failed to fetch": "فشل في جلب البيانات",
  "An error occurred": "حدث خطأ",
  "Something went wrong": "حدث خطأ ما",
  "Please try again": "يرجى المحاولة مرة أخرى",
  "Please try again later": "يرجى المحاولة مرة أخرى لاحقاً",
  "An unexpected error": "خطأ غير متوقع",

  // Empty states
  "No data available": "لا تتوفر بيانات",
  "No results found": "لم يتم العثور على نتائج",
  "No records found": "لم يتم العثور على سجلات",
  "No items found": "لم يتم العثور على عناصر",
  "No incidents found": "لم يتم العثور على حوادث",
  "No observations found": "لم يتم العثور على ملاحظات",
  "No inspections found": "لم يتم العثور على عمليات فحص",
  "No assets found": "لم يتم العثور على أصول",
  "No workers found": "لم يتم العثور على عمال",
  "No visitors found": "لم يتم العثور على زوار",
  "No contractors found": "لم يتم العثور على مقاولين",
  "No notifications": "لا توجد إشعارات",
  "No pending actions": "لا توجد إجراءات معلقة",
  "No active patrols": "لا توجد دوريات نشطة",
  "No data to display": "لا توجد بيانات للعرض",
  "No data for this period": "لا توجد بيانات لهذه الفترة",
  "No matching records": "لا توجد سجلات مطابقة",
  "Start by creating": "ابدأ بإنشاء",
  "Get started by": "ابدأ بـ",

  // Prompts
  "Click to": "اضغط لـ",
  "Select a": "اختر",
  "Enter a": "أدخل",
  "Type to search": "اكتب للبحث",
  "Search for": "البحث عن",
  "Search by": "البحث حسب",
  "Filter by": "تصفية حسب",
  "Sort by": "ترتيب حسب",
  "Group by": "تجميع حسب",

  // Access
  "Not found": "غير موجود",
  "Access denied": "تم رفض الوصول",
  "Permission denied": "تم رفض الصلاحية",
  "Not authorized": "غير مصرح",
  "Session expired": "انتهت الجلسة",
  "You do not have permission": "ليس لديك صلاحية",
  "You are not authorized": "أنت غير مصرح لك",
  "Contact your administrator": "تواصل مع المسؤول",
  "Please log in": "يرجى تسجيل الدخول",
  "Your session has expired": "انتهت جلستك",

  // Workflow-specific
  "Pending department representative": "في انتظار ممثل القسم",
  "Pending expert screening": "في انتظار فحص الخبير",
  "Pending manager approval": "في انتظار موافقة المدير",
  "Pending HSSE validation": "في انتظار تحقق السلامة والصحة والأمن والبيئة",
  "Pending final closure": "في انتظار الإغلاق النهائي",
  "Under investigation": "قيد التحقيق",
  "Investigation complete": "اكتمل التحقيق",
  "Actions pending": "إجراءات معلقة",
  "Observation actions pending": "إجراءات الملاحظة معلقة",
  "Pending closure": "في انتظار الإغلاق",

  // Common phrases
  "No records": "لا توجد سجلات",
  "Showing results for": "عرض النتائج لـ",
  "Total records": "إجمالي السجلات",
  "Last updated": "آخر تحديث",
  "Created on": "تم الإنشاء في",
  "Updated on": "تم التحديث في",
  "Reported on": "تم الإبلاغ في",
  "Assigned on": "تم التعيين في",
  "Closed on": "تم الإغلاق في",
  "Due on": "الاستحقاق في",
  "Valid until": "صالح حتى",
  "Expires on": "ينتهي في",
  "Effective from": "ساري من",

  // Asset-specific
  "Asset not found": "الأصل غير موجود",
  "Maintenance due": "صيانة مستحقة",
  "Warranty expired": "انتهى الضمان",
  "Under warranty": "تحت الضمان",
  "Out of service": "خارج الخدمة",
  "In service": "في الخدمة",

  // Contractor-specific
  "Worker not found": "العامل غير موجود",
  "Company not found": "الشركة غير موجودة",
  "Gate pass expired": "انتهى تصريح الدخول",
  "Gate pass valid": "تصريح الدخول صالح",
  "Not on site": "ليس في الموقع",
  "Currently on site": "حالياً في الموقع",
  "Documents expired": "المستندات منتهية الصلاحية",
  "Documents valid": "المستندات صالحة",
  "All documents valid": "جميع المستندات صالحة",
  "Missing documents": "مستندات ناقصة",
  "Compliance check": "فحص الامتثال",
  "Compliance passed": "اجتاز فحص الامتثال",
  "Compliance failed": "فشل في فحص الامتثال",
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
  if (!enValue || typeof enValue !== 'string') return null;
  
  // Exact match in main dictionary
  if (DICTIONARY[enValue]) return DICTIONARY[enValue];
  
  // Exact match in sentence dictionary
  if (SENTENCE_DICT[enValue]) return SENTENCE_DICT[enValue];
  
  // Try case-insensitive exact match
  const lowerVal = enValue.toLowerCase();
  for (const [key, val] of Object.entries(DICTIONARY)) {
    if (key.toLowerCase() === lowerVal) return val;
  }
  for (const [key, val] of Object.entries(SENTENCE_DICT)) {
    if (key.toLowerCase() === lowerVal) return val;
  }

  // Extract placeholders, translate the text part, then re-insert
  const placeholders = [];
  let cleanedValue = enValue.replace(/\{\{[^}]+\}\}/g, (match) => {
    placeholders.push(match);
    return `__PH${placeholders.length - 1}__`;
  });
  
  // Try dictionary on cleaned value
  if (DICTIONARY[cleanedValue]) {
    let result = DICTIONARY[cleanedValue];
    placeholders.forEach((ph, idx) => { result = result.replace(`__PH${idx}__`, ph); });
    return result;
  }

  // For short strings (1-4 words), try word-by-word
  const words = cleanedValue.split(/\s+/);
  if (words.length <= 4 && words.length > 0) {
    const translated = words.map(w => {
      return DICTIONARY[w] || 
             DICTIONARY[w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()] || 
             DICTIONARY[w.toLowerCase()] ||
             DICTIONARY[w.toUpperCase()] ||
             null;
    });
    if (translated.every(t => t !== null)) {
      let result = translated.join(' ');
      placeholders.forEach((ph, idx) => { result = result.replace(`__PH${idx}__`, ph); });
      return result;
    }
  }
  
  // Try sentence-level partial match (longest match first)
  const sortedSentences = Object.entries(SENTENCE_DICT).sort((a, b) => b[0].length - a[0].length);
  for (const [pattern, translation] of sortedSentences) {
    if (cleanedValue.toLowerCase() === pattern.toLowerCase()) {
      let result = translation;
      placeholders.forEach((ph, idx) => { result = result.replace(`__PH${idx}__`, ph); });
      return result;
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
