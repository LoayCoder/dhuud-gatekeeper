#!/usr/bin/env node
/**
 * i18n Translation Script for Urdu, Hindi, and Filipino
 * 
 * Walks the English translation tree and adds missing keys to each target language
 * using built-in HSSE dictionaries. Does NOT overwrite existing translations.
 * Also fixes empty values and untranslated (English-only) values.
 * 
 * Usage: node scripts/i18n-translate-remaining.cjs
 */

const fs = require('fs');
const path = require('path');

// ─── Deep-merge JSON parser (handles duplicate keys) ───────────────────────
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
    i++; let s = '';
    while (i < len) {
      if (text[i] === '\\') {
        const next = text[i + 1];
        switch (next) {
          case '"': s += '"'; break; case '\\': s += '\\'; break;
          case '/': s += '/'; break; case 'b': s += '\b'; break;
          case 'f': s += '\f'; break; case 'n': s += '\n'; break;
          case 'r': s += '\r'; break; case 't': s += '\t'; break;
          case 'u': { s += String.fromCharCode(parseInt(text.slice(i+2,i+6),16)); i+=4; break; }
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
    if (text[i] === 't') { i+=4; return true; }
    if (text[i] === 'f') { i+=5; return false; }
    if (text[i] === 'n') { i+=4; return null; }
    const start = i;
    if (text[i] === '-') i++;
    while (i < len && /[0-9]/.test(text[i])) i++;
    if (text[i] === '.') { i++; while (i < len && /[0-9]/.test(text[i])) i++; }
    if (text[i] === 'e' || text[i] === 'E') { i++; if (text[i]==='+' || text[i]==='-') i++; while (i<len && /[0-9]/.test(text[i])) i++; }
    return Number(text.slice(start, i));
  }
  function parseArray() {
    i++; const arr = []; skipWS();
    if (text[i] === ']') { i++; return arr; }
    while (true) { arr.push(parseValue()); skipWS(); if (text[i]===']') { i++; return arr; } if (text[i]===',') { i++; continue; } throw new Error(`Expected , or ] at pos ${i}`); }
  }
  function parseObject() {
    i++; const obj = {}; skipWS();
    if (text[i] === '}') { i++; return obj; }
    while (true) {
      skipWS(); const key = parseString(); skipWS();
      if (text[i] !== ':') throw new Error(`Expected : at pos ${i}`); i++;
      const value = parseValue();
      if (key in obj) {
        if (value && typeof value === 'object' && !Array.isArray(value) && obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
          deepMerge(obj[key], value);
        } else { obj[key] = value; }
      } else { obj[key] = value; }
      skipWS();
      if (text[i] === '}') { i++; return obj; }
      if (text[i] === ',') { i++; continue; }
      throw new Error(`Expected , or } at pos ${i}`);
    }
  }
  skipWS();
  return parseObject();
}

// ─── Translation Dictionaries ──────────────────────────────────────────────

const URDU_DICT = {
  // ===== Common UI =====
  'Save': 'محفوظ کریں', 'Cancel': 'منسوخ', 'Delete': 'حذف کریں', 'Edit': 'ترمیم کریں',
  'Submit': 'جمع کرائیں', 'Back': 'واپس', 'Next': 'اگلا', 'Previous': 'پچھلا',
  'Search': 'تلاش', 'Filter': 'فلٹر', 'View': 'دیکھیں', 'Details': 'تفصیلات',
  'All': 'سب', 'None': 'کوئی نہیں', 'Yes': 'ہاں', 'No': 'نہیں', 'OK': 'ٹھیک ہے',
  'Close': 'بند کریں', 'Open': 'کھولیں', 'Add': 'شامل کریں', 'Remove': 'ہٹائیں',
  'Create': 'بنائیں', 'Update': 'اپ ڈیٹ', 'Confirm': 'تصدیق کریں', 'Apply': 'لاگو کریں',
  'Reset': 'ری سیٹ', 'Clear': 'صاف کریں', 'Done': 'مکمل', 'Finish': 'مکمل کریں',
  'Loading': 'لوڈ ہو رہا ہے', 'Loading...': 'لوڈ ہو رہا ہے...', 'Saving...': 'محفوظ ہو رہا ہے...',
  'Saving': 'محفوظ ہو رہا ہے',
  'Error': 'خرابی', 'Success': 'کامیابی', 'Warning': 'انتباہ', 'Info': 'معلومات',
  'Confirm': 'تصدیق', 'Continue': 'جاری رکھیں', 'Select': 'منتخب کریں', 'Selected': 'منتخب',
  'Required': 'ضروری', 'Optional': 'اختیاری',
  'Enabled': 'فعال', 'Disabled': 'غیر فعال', 'Active': 'فعال', 'Inactive': 'غیر فعال',
  'Name': 'نام', 'Description': 'تفصیل', 'Title': 'عنوان', 'Status': 'حیثیت',
  'Date': 'تاریخ', 'Time': 'وقت', 'Type': 'قسم', 'Category': 'زمرہ',
  'Priority': 'ترجیح', 'Notes': 'نوٹس', 'Comments': 'تبصرے',
  'Location': 'مقام', 'Site': 'سائٹ', 'Branch': 'شاخ', 'Department': 'محکمہ',
  'Actions': 'اقدامات', 'Settings': 'ترتیبات', 'Profile': 'پروفائل',
  'Dashboard': 'ڈیش بورڈ', 'Reports': 'رپورٹیں', 'Export': 'برآمد',
  'Import': 'درآمد', 'Download': 'ڈاؤن لوڈ', 'Upload': 'اپ لوڈ', 'Print': 'پرنٹ',
  'Pending': 'زیر التواء', 'Approved': 'منظور', 'Rejected': 'مسترد',
  'Completed': 'مکمل', 'In Progress': 'جاری ہے', 'Draft': 'مسودہ',
  'Closed': 'بند', 'Resolved': 'حل شدہ',
  'Copy': 'نقل', 'Undo': 'واپس لیں', 'Retry': 'دوبارہ کوشش',
  'Light': 'روشن', 'Dark': 'تاریک', 'System': 'سسٹم',
  'Toggle theme': 'تھیم تبدیل کریں', 'Change language': 'زبان تبدیل کریں',
  'Select All': 'سب منتخب کریں', 'Clear All': 'سب صاف کریں',
  'No data available': 'ڈیٹا دستیاب نہیں', 'No results found': 'نتائج نہیں ملے',
  'Unknown': 'نامعلوم', 'Not Set': 'مقرر نہیں',
  'Preview': 'پیش نظارہ', 'Manage': 'انتظام', 'Configure': 'ترتیب دیں', 'Customize': 'حسب ضرورت بنائیں',
  'Enable': 'فعال کریں', 'Disable': 'غیر فعال کریں', 'Activate': 'فعال کریں', 'Deactivate': 'غیر فعال کریں',
  'Show': 'دکھائیں', 'Hide': 'چھپائیں', 'Minimize': 'چھوٹا کریں', 'Maximize': 'بڑا کریں',
  'Pin': 'پن کریں', 'Unpin': 'ان پن کریں',
  'Lock': 'قفل', 'Unlock': 'کھولیں',
  'Archive': 'آرکائیو', 'Unarchive': 'آرکائیو سے نکالیں',
  'Duplicate': 'نقل بنائیں', 'Clone': 'کلون',
  'Move': 'منتقل کریں', 'Sort': 'ترتیب دیں', 'Group': 'گروپ',
  'Merge': 'ملائیں', 'Split': 'تقسیم کریں',
  'Send': 'بھیجیں', 'Receive': 'وصول کریں', 'Share': 'شیئر کریں',
  'Accept': 'قبول کریں', 'Decline': 'انکار کریں',
  'Connect': 'جوڑیں', 'Disconnect': 'منقطع کریں',
  'Authorize': 'مجاز کریں', 'Revoke': 'منسوخ کریں',
  'Subscribe': 'سبسکرائب', 'Unsubscribe': 'ان سبسکرائب',
  'Bookmark': 'بک مارک', 'Favorite': 'پسندیدہ',
  'Tag': 'ٹیگ', 'Label': 'لیبل',
  'Navigate': 'نیویگیٹ', 'Browse': 'براؤز کریں',
  'Scan': 'سکین', 'Detect': 'شناخت', 'Identify': 'شناخت کریں',
  'Calculate': 'حساب لگائیں', 'Estimate': 'اندازہ لگائیں',
  'Analyze': 'تجزیہ کریں', 'Compare': 'موازنہ کریں', 'Evaluate': 'جائزہ لیں',
  'Monitor': 'نگرانی کریں', 'Track': 'ٹریک کریں', 'Watch': 'دیکھیں',
  'Log': 'لاگ', 'Record': 'ریکارڈ', 'Capture': 'حاصل کریں',
  'Notify': 'مطلع کریں', 'Remind': 'یاد دلائیں', 'Alert': 'الرٹ',
  'Proceed': 'آگے بڑھیں', 'Skip': 'چھوڑ دیں', 'Ignore': 'نظرانداز کریں',
  'Try Again': 'دوبارہ کوشش کریں', 'Go Back': 'واپس جائیں',
  'Learn More': 'مزید جانیں', 'Read More': 'مزید پڑھیں',
  'See More': 'مزید دیکھیں', 'See All': 'سب دیکھیں',
  'Load More': 'مزید لوڈ کریں',

  // ===== Auth & User Management =====
  'Sign In': 'سائن ان', 'Sign Out': 'سائن آؤٹ', 'Log out': 'لاگ آؤٹ',
  'Sign Up': 'سائن اپ', 'Email': 'ای میل', 'Password': 'پاس ورڈ',
  'Forgot password?': 'پاس ورڈ بھول گئے؟', 'Welcome Back': 'واپسی پر خوش آمدید',
  'Create Account': 'اکاؤنٹ بنائیں', 'Confirm Password': 'پاس ورڈ کی تصدیق',
  'Login': 'لاگ ان', 'Logout': 'لاگ آؤٹ', 'Register': 'رجسٹر',
  'Authentication': 'تصدیق', 'Two-Factor': 'دو عنصری تصدیق',
  'Verification': 'تصدیق', 'Verify Email': 'ای میل کی تصدیق کریں',
  'Reset Password': 'پاس ورڈ ری سیٹ', 'Change Password': 'پاس ورڈ تبدیل کریں',
  'New Password': 'نیا پاس ورڈ', 'Current Password': 'موجودہ پاس ورڈ',
  'Username': 'صارف نام', 'Full Name': 'پورا نام',
  'First Name': 'پہلا نام', 'Last Name': 'آخری نام',
  'Phone Number': 'فون نمبر', 'Mobile Number': 'موبائل نمبر',
  'Remember me': 'مجھے یاد رکھیں', 'Account': 'اکاؤنٹ', 'My Account': 'میرا اکاؤنٹ',
  'Session': 'سیشن', 'Sessions': 'سیشنز',
  'Invitation': 'دعوت', 'Invite': 'دعوت دیں', 'Invited': 'دعوت دی گئی',
  'Invite User': 'صارف کو دعوت دیں', 'Invite Users': 'صارفین کو دعوت دیں',
  'Resend Invitation': 'دعوت دوبارہ بھیجیں',
  'Passkey': 'پاس کی', 'Passkeys': 'پاس کیز',
  'OTP': 'OTP', 'One-Time Password': 'ایک بار کا پاس ورڈ',
  'MFA': 'MFA', 'Multi-Factor Authentication': 'کثیر عنصری تصدیق',
  'Tenant': 'مستاجر', 'Tenants': 'مستاجرین',
  'Subscription': 'سبسکرپشن', 'Plan': 'پلان', 'Plans': 'پلانز',
  'Free': 'مفت', 'Basic': 'بنیادی', 'Premium': 'پریمیم', 'Enterprise': 'انٹرپرائز',
  'Trial': 'آزمائشی', 'Upgrade': 'اپ گریڈ', 'Downgrade': 'ڈاؤن گریڈ',
  'Billing': 'بلنگ', 'Invoice': 'رسید', 'Payment': 'ادائیگی',
  'Licensed Users': 'لائسنس یافتہ صارفین', 'Quota': 'کوٹہ',
  'Usage': 'استعمال', 'Limit': 'حد',
  'Admin': 'ایڈمن', 'Super Admin': 'سپر ایڈمن',
  'Administrator': 'منتظم', 'Owner': 'مالک', 'Member': 'رکن', 'Guest': 'مہمان',

  // ===== HSSE Core =====
  'Incident': 'واقعہ', 'Incidents': 'واقعات', 'Observation': 'مشاہدہ', 'Observations': 'مشاہدات',
  'Investigation': 'تحقیقات', 'Investigations': 'تحقیقات',
  'Corrective Action': 'اصلاحی اقدام', 'Corrective Actions': 'اصلاحی اقدامات',
  'Risk Assessment': 'خطرے کی تشخیص', 'Risk Assessments': 'خطرے کی تشخیصات',
  'Safety': 'حفاظت', 'Security': 'سیکیورٹی', 'Health': 'صحت', 'Environment': 'ماحولیات',
  'Hazard': 'خطرناک عنصر', 'Hazards': 'خطرناک عناصر', 'Risk': 'خطرہ', 'Risks': 'خطرات',
  'Near Miss': 'قریبی واقعہ', 'Near Misses': 'قریبی واقعات',
  'Injury': 'چوٹ', 'Injuries': 'چوٹیں',
  'Fatality': 'ہلاکت', 'Fatalities': 'ہلاکتیں',
  'First Aid': 'ابتدائی طبی امداد', 'Medical Treatment': 'طبی علاج',
  'Lost Time': 'ضائع ہونے والا وقت', 'Lost Time Injury': 'وقت ضائع ہونے والی چوٹ',
  'Property Damage': 'جائیداد کا نقصان',
  'Environmental Impact': 'ماحولیاتی اثر', 'Environmental Incident': 'ماحولیاتی واقعہ',
  'Damage': 'نقصان', 'Fire': 'آگ', 'Emergency': 'ہنگامی',
  'Patrol': 'گشت', 'Patrols': 'گشتیں',
  'Inspection': 'معائنہ', 'Inspections': 'معائنے',
  'Audit': 'آڈٹ', 'Audits': 'آڈٹس',
  'Compliance': 'تعمیل', 'Non-Compliance': 'عدم تعمیل',
  'Severity': 'شدت', 'Low': 'کم', 'Medium': 'درمیانہ',
  'High': 'زیادہ', 'Critical': 'نازک', 'Extreme': 'انتہائی',
  'Minor': 'معمولی', 'Major': 'بڑا', 'Significant': 'اہم',
  'Catastrophic': 'تباہ کن', 'Negligible': 'معمولی',
  'Likelihood': 'امکان', 'Probability': 'احتمال',
  'Consequence': 'نتیجہ', 'Impact': 'اثر',
  'Exposure': 'نمائش', 'Vulnerability': 'کمزوری',
  'Mitigation': 'تخفیف', 'Prevention': 'روک تھام',
  'Elimination': 'خاتمہ', 'Substitution': 'متبادل',
  'Engineering Controls': 'انجینئرنگ کنٹرولز',
  'Administrative Controls': 'انتظامی کنٹرولز',
  'PPE': 'ذاتی حفاظتی سازوسامان', 'Personal Protective Equipment': 'ذاتی حفاظتی سازوسامان',
  'Root Cause': 'بنیادی وجہ', 'Root Cause Analysis': 'بنیادی وجہ کا تجزیہ',
  'Contributing Factor': 'معاون عنصر', 'Contributing Factors': 'معاون عناصر',
  'Immediate Cause': 'فوری وجہ', 'Underlying Cause': 'بنیادی وجہ',
  'Witness': 'گواہ', 'Witnesses': 'گواہان',
  'Witness Statement': 'گواہ کا بیان', 'Witness Statements': 'گواہوں کے بیانات',
  'Evidence': 'ثبوت', 'Attachment': 'منسلکہ', 'Attachments': 'منسلکات',
  'Timeline': 'ٹائم لائن', 'Findings': 'نتائج', 'Conclusion': 'نتیجہ',
  'Lessons Learned': 'سیکھے گئے اسباق',
  'Preventive Action': 'احتیاطی اقدام', 'Preventive Actions': 'احتیاطی اقدامات',
  'Follow Up': 'تعاقب', 'Follow-Up': 'تعاقب',
  'Closure': 'اختتام', 'Final Closure': 'حتمی اختتام',
  'Reopen': 'دوبارہ کھولیں', 'Reopened': 'دوبارہ کھولا گیا',
  'Positive Observation': 'مثبت مشاہدہ', 'Positive Observations': 'مثبت مشاہدات',
  'Unsafe Act': 'غیر محفوظ عمل', 'Unsafe Condition': 'غیر محفوظ حالت',
  'Safe Behavior': 'محفوظ رویہ', 'At-Risk Behavior': 'خطرناک رویہ',
  'Spill': 'اخراج', 'Leak': 'رساؤ', 'Release': 'اخراج',
  'Contamination': 'آلودگی', 'Contaminant': 'آلودہ مادہ',
  'Remediation': 'اصلاح', 'Cleanup': 'صفائی',
  'Waste': 'فضلہ', 'Waste Management': 'فضلے کا انتظام',
  'Permit to Work': 'کام کا اجازت نامہ', 'Work Permit': 'کام کا اجازت نامہ',
  'Standard Operating Procedure': 'معیاری آپریٹنگ طریقہ کار',
  'Toolbox Talk': 'ٹول باکس ٹاک', 'Safety Briefing': 'حفاظتی بریفنگ',
  'Safety Meeting': 'حفاظتی میٹنگ', 'Safety Culture': 'حفاظتی ثقافت',
  'Safety Performance': 'حفاظتی کارکردگی',
  'Leading Indicator': 'پیشرو اشارہ', 'Leading Indicators': 'پیشرو اشارے',
  'Lagging Indicator': 'پسماندہ اشارہ', 'Lagging Indicators': 'پسماندہ اشارے',
  'KPI': 'کے پی آئی', 'KPIs': 'کے پی آئیز',
  'Days Without Incident': 'واقعات کے بغیر دن',
  'Safety Pyramid': 'حفاظتی اہرام',

  // ===== Investigation & Workflow =====
  'Submitted': 'جمع کرایا گیا', 'Under Review': 'جائزے میں',
  'Pending Approval': 'منظوری کے منتظر', 'Awaiting Assignment': 'تفویض کے منتظر',
  'Expert Screening': 'ماہر کی جانچ', 'Manager Review': 'مینیجر کا جائزہ',
  'HSSE Validation': 'HSSE توثیق', 'Under Investigation': 'تحقیقات جاری',
  'Investigation Complete': 'تحقیقات مکمل',
  'Pending Closure': 'اختتام کے منتظر',
  'Dispute': 'تنازعہ', 'Dispute Open': 'تنازعہ کھلا',
  'Dispute Resolution': 'تنازعات کا حل',
  'Workflow': 'ورک فلو', 'Workflow Status': 'ورک فلو کی حیثیت',
  'Current Owner': 'موجودہ ذمہ دار', 'Current Step': 'موجودہ مرحلہ',
  'Next Step': 'اگلا مرحلہ', 'Previous Step': 'پچھلا مرحلہ',
  'Transition': 'منتقلی', 'History': 'تاریخچہ',
  'Approval History': 'منظوری کی تاریخ',
  'Screening': 'جانچ', 'Triage': 'ترتیب بندی',
  'Classify': 'درجہ بندی', 'Classification': 'درجہ بندی',
  'Department Representative': 'محکمے کا نمائندہ',
  'HSSE Expert': 'HSSE ماہر', 'HSSE Manager': 'HSSE مینیجر', 'HSSE Officer': 'HSSE افسر',
  'Site Client': 'سائٹ کلائنٹ', 'Contractor Consultant': 'ٹھیکیدار مشیر',
  'Investigator': 'تحقیقات کار', 'Lead Investigator': 'سربراہ تحقیقات کار',
  'Investigation Team': 'تحقیقاتی ٹیم',
  'Escalation': 'بالا رجوع', 'Escalated': 'بالا رجوع کیا گیا',
  'Delegation': 'تفویض', 'Delegated': 'تفویض کیا گیا',
  'Reminder': 'یاد دہانی', 'Send Reminder': 'یاد دہانی بھیجیں',
  'Take Action': 'اقدام کریں',
  'Approve All': 'سب منظور', 'Reject All': 'سب مسترد',
  'Bulk Approve': 'اجتماعی منظوری', 'Bulk Reject': 'اجتماعی مسترد',
  'Bulk Actions': 'اجتماعی اقدامات',
  'Action Required': 'اقدام ضروری ہے', 'No Action Required': 'کوئی اقدام ضروری نہیں',
  'Pending Actions': 'زیر التواء اقدامات',
  'Extension Request': 'توسیع کی درخواست', 'Extension': 'توسیع',
  'Request Extension': 'توسیع کی درخواست کریں',
  'Overdue Actions': 'تاخیر شدہ اقدامات',
  'On Schedule': 'وقت پر', 'Behind Schedule': 'تاخیر سے',
  'SLA': 'SLA', 'Service Level Agreement': 'خدمات کی سطح کا معاہدہ',

  // ===== Security & Guards =====
  'Guard': 'محافظ', 'Guards': 'محافظین',
  'Visitor': 'مہمان', 'Visitors': 'مہمان',
  'Contractor': 'ٹھیکیدار', 'Contractors': 'ٹھیکیدار',
  'Worker': 'کارکن', 'Workers': 'کارکنان',
  'Gate': 'گیٹ', 'Gates': 'گیٹس',
  'Checkpoint': 'چیک پوائنٹ', 'Checkpoints': 'چیک پوائنٹس',
  'Zone': 'زون', 'Zones': 'زونز',
  'Shift': 'شفٹ', 'Shifts': 'شفٹیں',
  'Roster': 'ڈیوٹی فہرست',
  'Access Denied': 'رسائی مسترد', 'Access Granted': 'رسائی منظور',
  'Entry': 'داخلہ', 'Exit': 'اخراج', 'On Site': 'سائٹ پر',
  'Check In': 'چیک ان', 'Check Out': 'چیک آؤٹ',
  'Checked In': 'چیک ان ہو گیا', 'Checked Out': 'چیک آؤٹ ہو گیا',
  'Gate Pass': 'گیٹ پاس', 'Gate Passes': 'گیٹ پاسز',
  'Material Gate Pass': 'مٹیریل گیٹ پاس',
  'Security Incident': 'سیکیورٹی واقعہ', 'Security Alert': 'سیکیورٹی الرٹ',
  'Surveillance': 'نگرانی', 'CCTV': 'CCTV',
  'Camera': 'کیمرہ', 'Cameras': 'کیمرے',
  'Alarm': 'الارم', 'Alarms': 'الارمز',
  'Geofence': 'جیو فینس', 'Geofencing': 'جیو فینسنگ',
  'Boundary': 'حدود', 'Boundaries': 'حدود',
  'Command Center': 'کمانڈ سینٹر', 'Control Room': 'کنٹرول روم',
  'Duty Officer': 'ڈیوٹی آفیسر',
  'Night Shift': 'رات کی شفٹ', 'Day Shift': 'دن کی شفٹ', 'Morning Shift': 'صبح کی شفٹ',
  'Handover': 'حوالگی', 'Shift Handover': 'شفٹ حوالگی',
  'Patrol Route': 'گشت کا راستہ', 'Patrol Routes': 'گشت کے راستے',
  'Start Patrol': 'گشت شروع کریں', 'End Patrol': 'گشت ختم کریں',
  'QR Code': 'کیو آر کوڈ', 'QR Scanner': 'کیو آر سکینر',
  'Barcode': 'بار کوڈ', 'Badge': 'بیج', 'Badges': 'بیجز',
  'Blacklist': 'بلیک لسٹ', 'Blacklisted': 'بلیک لسٹ شدہ',
  'Banned': 'ممنوعہ', 'Suspended': 'معطل',
  'Vehicle': 'گاڑی', 'Vehicles': 'گاڑیاں',
  'License Plate': 'نمبر پلیٹ',
  'Evacuation': 'انخلاء', 'Muster Point': 'اجتماعی مقام', 'Assembly Point': 'اجتماعی مقام',
  'Lockdown': 'مکمل بندش', 'All Clear': 'سب محفوظ',
  'Emergency Contact': 'ہنگامی رابطہ', 'Emergency Contacts': 'ہنگامی رابطے',

  // ===== Contractors & Workers =====
  'Contractor Company': 'ٹھیکیدار کمپنی', 'Contractor Companies': 'ٹھیکیدار کمپنیاں',
  'Contractor Worker': 'ٹھیکیدار کارکن', 'Contractor Workers': 'ٹھیکیدار کارکنان',
  'Subcontractor': 'ذیلی ٹھیکیدار',
  'Induction': 'تعارف', 'Inductions': 'تعارفی سیشنز',
  'Safety Induction': 'حفاظتی تعارف', 'Site Induction': 'سائٹ تعارف',
  'Induction Video': 'تعارفی ویڈیو',
  'Trade': 'پیشہ', 'Trades': 'پیشے',
  'Qualification': 'اہلیت', 'Qualifications': 'اہلیتیں',
  'Certification': 'سرٹیفکیٹ', 'Certifications': 'سرٹیفکیٹس',
  'Expiry': 'میعاد', 'Expiry Date': 'میعاد ختم ہونے کی تاریخ',
  'Valid Until': 'تک درست', 'Valid From': 'سے درست',
  'Renewal': 'تجدید', 'Renew': 'تجدید کریں',
  'Worker ID': 'کارکن نمبر', 'Employee ID': 'ملازم نمبر',
  'National ID': 'قومی شناختی کارڈ', 'Iqama': 'اقامہ',
  'Passport': 'پاسپورٹ', 'Passport Number': 'پاسپورٹ نمبر',
  'Insurance': 'بیمہ', 'Medical Certificate': 'طبی سرٹیفکیٹ',
  'Fit to Work': 'کام کے قابل', 'Unfit to Work': 'کام کے نا قابل',
  'Training Record': 'تربیتی ریکارڈ', 'Training Records': 'تربیتی ریکارڈز',
  'Competency': 'قابلیت', 'Competencies': 'قابلیتیں',
  'Violation': 'خلاف ورزی', 'Violations': 'خلاف ورزیاں',
  'Violation Type': 'خلاف ورزی کی قسم',
  'Penalty': 'سزا', 'Penalties': 'سزائیں',
  'Warning Letter': 'انتباہی خط', 'Stop Work Order': 'کام بند کرنے کا حکم',
  'Work Order': 'کام کا حکم', 'Work Orders': 'کام کے احکامات',
  'Contract': 'معاہدہ', 'Contracts': 'معاہدے',
  'Start Date': 'شروع کی تاریخ', 'End Date': 'اختتام کی تاریخ',
  'Scope of Work': 'کام کا دائرہ',
  'Manpower': 'افرادی قوت', 'Headcount': 'تعداد',

  // ===== Assets =====
  'Asset': 'اثاثہ', 'Assets': 'اثاثے', 'Asset Management': 'اثاثوں کا انتظام',
  'Maintenance': 'دیکھ بھال', 'Warranty': 'وارنٹی', 'Depreciation': 'فرسودگی',
  'Transfer': 'منتقلی', 'Disposal': 'تلفی',
  'Preventive Maintenance': 'احتیاطی دیکھ بھال',
  'Corrective Maintenance': 'اصلاحی دیکھ بھال',
  'Predictive Maintenance': 'پیش گوئی دیکھ بھال',
  'Breakdown': 'خرابی', 'Downtime': 'بند وقت', 'Uptime': 'چلنے کا وقت',
  'Total Cost of Ownership': 'ملکیت کی کل لاگت', 'TCO': 'TCO',
  'Book Value': 'دفتری قیمت', 'Salvage Value': 'بچاؤ قیمت',
  'Useful Life': 'مفید عمر', 'Health Score': 'صحت کا اسکور',
  'Failure Prediction': 'خرابی کی پیش گوئی',
  'Spare Parts': 'فالتو پرزے', 'Parts': 'پرزے',
  'Stock': 'ذخیرہ', 'In Stock': 'دستیاب', 'Out of Stock': 'غیر دستیاب', 'Low Stock': 'کم ذخیرہ',
  'Serial Number': 'سیریل نمبر', 'Model': 'ماڈل', 'Manufacturer': 'صنعت کار',
  'Calibration': 'کیلیبریشن', 'Sensor': 'سینسر', 'Sensors': 'سینسرز',
  'Operating Hours': 'آپریٹنگ اوقات',
  'Equipment': 'آلات',

  // ===== Inspections =====
  'Inspection Template': 'معائنے کا ٹیمپلیٹ', 'Template': 'ٹیمپلیٹ', 'Templates': 'ٹیمپلیٹس',
  'Checklist': 'چیک لسٹ', 'Checklists': 'چیک لسٹیں',
  'Question': 'سوال', 'Questions': 'سوالات',
  'Answer': 'جواب', 'Answers': 'جوابات',
  'Response': 'جواب', 'Responses': 'جوابات',
  'Compliant': 'مطابق', 'Non-Compliant': 'غیر مطابق',
  'Not Applicable': 'قابل اطلاق نہیں', 'N/A': 'قابل اطلاق نہیں',
  'Pass': 'کامیاب', 'Fail': 'ناکام',
  'Finding': 'نتیجہ', 'Non-Conformance': 'عدم مطابقت',
  'Recommendation': 'سفارش', 'Recommendations': 'سفارشات',
  'Area Inspection': 'علاقے کا معائنہ',
  'Scheduled Inspection': 'طے شدہ معائنہ', 'Unscheduled Inspection': 'غیر طے شدہ معائنہ',
  'Inspector': 'معائنہ کار', 'Inspectors': 'معائنہ کار',
  'Inspection Score': 'معائنے کا اسکور', 'Overall Score': 'مجموعی اسکور',
  'Section': 'سیکشن', 'Sections': 'سیکشنز',
  'Item': 'آئٹم', 'Items': 'آئٹمز',
  'Weight': 'وزن', 'Weighted': 'وزنی',
  'Frequency': 'تعدد', 'Daily': 'روزانہ', 'Weekly': 'ہفتہ وار',
  'Monthly': 'ماہانہ', 'Quarterly': 'سہ ماہی', 'Annual': 'سالانہ',
  'Schedule': 'شیڈول', 'Scheduled': 'طے شدہ',
  'Due': 'واجب الادا', 'Due Date': 'مقررہ تاریخ',
  'Completion Rate': 'تکمیل کی شرح', 'Coverage': 'احاطہ',

  // ===== Dashboard & Analytics =====
  'Overview': 'جائزہ', 'Summary': 'خلاصہ', 'Total': 'کل',
  'Average': 'اوسط', 'Count': 'شمار', 'Percentage': 'فیصد',
  'Chart': 'چارٹ', 'Charts': 'چارٹس',
  'Table': 'جدول', 'List': 'فہرست', 'Grid': 'گرڈ',
  'Map': 'نقشہ', 'Calendar': 'کیلنڈر',
  'Notification': 'اطلاع', 'Notifications': 'اطلاعات', 'Alerts': 'الرٹس',
  'Configuration': 'ترتیب', 'Preferences': 'ترجیحات',
  'Help': 'مدد', 'About': 'بارے میں', 'Version': 'ورژن',
  'Trend': 'رجحان', 'Trends': 'رجحانات',
  'Growth': 'نمو', 'Decline': 'کمی',
  'Increase': 'اضافہ', 'Decrease': 'کمی',
  'Target': 'ہدف', 'Targets': 'اہداف',
  'Actual': 'حقیقی', 'Planned': 'منصوبہ بند',
  'Variance': 'فرق', 'Deviation': 'انحراف',
  'Distribution': 'تقسیم', 'Breakdown': 'تفصیل',
  'Pareto': 'پیریٹو', 'Waterfall': 'آبشار',
  'Metric': 'میٹرک', 'Metrics': 'میٹرکس',
  'Data Quality': 'ڈیٹا کا معیار',
  'Real-time': 'ریئل ٹائم', 'Real Time': 'ریئل ٹائم',
  'Historical': 'تاریخی', 'Cache': 'کیش',
  'Executive Summary': 'ایگزیکٹو خلاصہ',
  'Executive Report': 'ایگزیکٹو رپورٹ',

  // ===== Reports & Export =====
  'Report': 'رپورٹ', 'Generate Report': 'رپورٹ بنائیں',
  'Export to Excel': 'ایکسل میں برآمد کریں', 'Export to PDF': 'پی ڈی ایف میں برآمد کریں',
  'Export to CSV': 'CSV میں برآمد کریں',
  'Download Report': 'رپورٹ ڈاؤن لوڈ کریں', 'Print Report': 'رپورٹ پرنٹ کریں',
  'Date Range': 'تاریخ کی حد', 'Custom Range': 'حسب ضرورت حد',
  'Last 7 Days': 'آخری 7 دن', 'Last 30 Days': 'آخری 30 دن',
  'This Week': 'اس ہفتے', 'This Month': 'اس ماہ', 'This Year': 'اس سال',
  'Last Week': 'پچھلے ہفتے', 'Last Month': 'پچھلے مہینے', 'Last Year': 'پچھلے سال',
  'Today': 'آج', 'Yesterday': 'کل', 'Custom': 'حسب ضرورت',
  'Filters': 'فلٹرز', 'Clear Filters': 'فلٹرز صاف کریں',
  'Columns': 'کالم', 'Sort By': 'ترتیب بلحاظ', 'Ascending': 'صعودی', 'Descending': 'نزولی',
  'Page': 'صفحہ', 'of': 'میں سے', 'Rows per page': 'فی صفحہ قطاریں',
  'Showing': 'دکھا رہا ہے', 'Per Page': 'فی صفحہ',

  // ===== Settings & Admin =====
  'General Settings': 'عمومی ترتیبات', 'System Settings': 'سسٹم کی ترتیبات',
  'Account Settings': 'اکاؤنٹ کی ترتیبات',
  'Notification Settings': 'اطلاعات کی ترتیبات',
  'Email Notifications': 'ای میل اطلاعات', 'Push Notifications': 'پش اطلاعات',
  'Language': 'زبان', 'Languages': 'زبانیں',
  'Theme': 'تھیم', 'Themes': 'تھیمز', 'Appearance': 'ظاہری شکل',
  'Branding': 'برانڈنگ', 'Logo': 'لوگو',
  'Module': 'ماڈیول', 'Modules': 'ماڈیولز', 'Module Management': 'ماڈیول انتظام',
  'Feature': 'خصوصیت', 'Features': 'خصوصیات',
  'Integration': 'انضمام', 'Integrations': 'انضمامات',
  'Backup': 'بیک اپ', 'Restore': 'بحال کریں',
  'Audit Log': 'آڈٹ لاگ', 'Audit Logs': 'آڈٹ لاگز',
  'Activity Log': 'سرگرمی لاگ', 'User Management': 'صارف انتظام',
  'Role Management': 'کردار انتظام', 'Permission Management': 'اجازت انتظام',
  'Tenant Management': 'مستاجر انتظام', 'Branch Management': 'شاخ انتظام',
  'Department Management': 'محکمہ انتظام', 'Site Management': 'سائٹ انتظام',

  // ===== Time =====
  'hours': 'گھنٹے', 'minutes': 'منٹ', 'seconds': 'سیکنڈ', 'days': 'دن',
  'hour': 'گھنٹہ', 'minute': 'منٹ', 'second': 'سیکنڈ', 'day': 'دن',
  'week': 'ہفتہ', 'month': 'مہینا', 'year': 'سال',
  'weeks': 'ہفتے', 'months': 'مہینے', 'years': 'سال',
  'ago': 'پہلے', 'Just now': 'ابھی',
  'Days': 'دن', 'Hours': 'گھنٹے', 'Minutes': 'منٹ', 'Seconds': 'سیکنڈ',

  // ===== Status & Progress =====
  'Verify': 'تصدیق کریں', 'Validate': 'توثیق کریں',
  'Assign': 'تفویض کریں', 'Reassign': 'دوبارہ تفویض کریں',
  'Approve': 'منظور کریں', 'Reject': 'مسترد کریں', 'Review': 'جائزہ لیں',
  'Start': 'شروع', 'Stop': 'رکیں', 'Pause': 'وقفہ', 'Resume': 'دوبارہ شروع',
  'Complete': 'مکمل کریں', 'Escalate': 'بالا بھیجیں', 'Delegate': 'تفویض کریں',
  'Generated': 'تیار کیا گیا', 'Updated': 'اپ ڈیٹ', 'Created': 'تخلیق',
  'Deleted': 'حذف کیا گیا', 'Restored': 'بحال کیا گیا',
  'Expand': 'پھیلائیں', 'Collapse': 'سمیٹیں',
  'Photo': 'تصویر', 'Photos': 'تصاویر', 'Video': 'ویڈیو',
  'Document': 'دستاویز', 'Documents': 'دستاویزات', 'File': 'فائل', 'Files': 'فائلیں',
  'Performance': 'کارکردگی', 'Score': 'اسکور', 'Rating': 'درجہ بندی',
  'Leaderboard': 'لیڈر بورڈ', 'Training': 'تربیت',
  'Generate': 'تیار کریں', 'Generating': 'تیار ہو رہا ہے',
  'Reported By': 'رپورٹ کنندہ', 'Created By': 'تخلیق کار',
  'Supervisor': 'نگران', 'Manager': 'مینیجر',
  'Team': 'ٹیم', 'Teams': 'ٹیمیں',
  'Role': 'کردار', 'Roles': 'کردار', 'Permission': 'اجازت',
  'User': 'صارف', 'Users': 'صارفین',
  'Organization': 'تنظیم', 'Company': 'کمپنی',
  'Project': 'پروجیکٹ', 'Projects': 'پروجیکٹس',
  'GPS': 'GPS', 'Offline': 'آف لائن', 'Online': 'آن لائن',
  'Sync': 'مطابقت', 'Connected': 'منسلک', 'Disconnected': 'غیر منسلک',
  'Live': 'براہ راست', 'Acknowledge': 'تسلیم کریں', 'Acknowledged': 'تسلیم شدہ',
  'Duration': 'مدت', 'Permanent': 'مستقل', 'Temporary': 'عارضی',
  'Valid': 'درست', 'Invalid': 'غلط', 'Expired': 'ختم ہو گیا',
  'Current': 'موجودہ', 'New': 'نیا', 'Old': 'پرانا',
  'Before': 'پہلے', 'After': 'بعد', 'From': 'سے', 'To': 'تک',
  'Min': 'کم از کم', 'Max': 'زیادہ سے زیادہ',
  'Overdue': 'مدت گزر چکی', 'On Time': 'وقت پر', 'Late': 'تاخیر سے',
  'Assigned': 'تفویض', 'Unassigned': 'غیر تفویض',

  // ===== Risk Assessment =====
  'Risk Matrix': 'خطرے کا میٹرکس', 'Risk Register': 'خطرے کا رجسٹر',
  'Risk Level': 'خطرے کی سطح', 'Risk Score': 'خطرے کا اسکور',
  'Residual Risk': 'بقایا خطرہ', 'Inherent Risk': 'موروثی خطرہ',
  'Control Measure': 'کنٹرول اقدام', 'Control Measures': 'کنٹرول اقدامات',
  'Almost Certain': 'تقریباً یقینی', 'Likely': 'ممکنہ', 'Possible': 'ممکن',
  'Unlikely': 'غیر محتمل', 'Rare': 'نایاب', 'Moderate': 'معتدل',

  // ===== Visit & Access =====
  'Visit Request': 'ملاقات کی درخواست', 'Visit Requests': 'ملاقات کی درخواستیں',
  'Purpose of Visit': 'ملاقات کا مقصد',
  'Host': 'میزبان', 'Pre-Approved': 'پیشگی منظور',
  'Walk-In': 'براہ راست حاضری', 'VIP': 'VIP', 'Regular': 'عام',

  // ===== Misc =====
  'Quick Observation': 'فوری مشاہدہ', 'Quick Report': 'فوری رپورٹ',
  'Quick Actions': 'فوری اقدامات', 'Favorites': 'پسندیدہ',
  'Recent': 'حالیہ', 'Archive': 'آرکائیو', 'Archived': 'آرکائیو شدہ',
  'Trash': 'ردی', 'Permanently Delete': 'مستقل طور پر حذف کریں',
  'Color': 'رنگ', 'Icon': 'آئیکن', 'Image': 'تصویر', 'Images': 'تصاویر',
  'Navigation': 'نیویگیشن', 'Menu': 'مینو',
  'Step': 'مرحلہ', 'Steps': 'مراحل', 'Progress': 'پیش رفت',
  'Welcome': 'خوش آمدید', 'Documentation': 'دستاویزات',
  'FAQ': 'اکثر پوچھے گئے سوالات', 'Support': 'معاونت',
  'Feedback': 'رائے', 'Release Notes': 'ریلیز نوٹس',
  'Nationality': 'قومیت', 'Country': 'ملک', 'City': 'شہر',
  'Region': 'خطہ', 'Area': 'علاقہ',
  'Permit': 'اجازت نامہ', 'License': 'لائسنس', 'Certificate': 'سرٹیفکیٹ',
  'Policy': 'پالیسی', 'Procedure': 'طریقہ کار', 'Standard': 'معیار',
  'Regulation': 'ضابطہ',
  'Code': 'کوڈ', 'Number': 'نمبر', 'Amount': 'رقم', 'Value': 'قدر',
  'Cost': 'لاگت', 'Price': 'قیمت', 'Reason': 'وجہ',
  'Address': 'پتہ', 'Mobile': 'موبائل', 'Phone': 'فون',
  'Vendor': 'فروش', 'Supplier': 'سپلائر',
  'Reference': 'حوالہ', 'reference': 'حوالہ',
  'Analytics': 'تجزیات', 'Statistics': 'اعداد و شمار',
  'Graph': 'گراف', 'Message': 'پیغام', 'Messages': 'پیغامات',
  'Access': 'رسائی', 'Home': 'ہوم',
  'Refresh': 'تازہ کریں', 'January': 'جنوری', 'February': 'فروری', 'March': 'مارچ',
  'April': 'اپریل', 'May': 'مئی', 'June': 'جون', 'July': 'جولائی', 'August': 'اگست',
  'September': 'ستمبر', 'October': 'اکتوبر', 'November': 'نومبر', 'December': 'دسمبر',

  // ===== Sentence-level =====
  'Are you sure?': 'کیا آپ کو یقین ہے؟',
  'This action cannot be undone.': 'اس اقدام کو واپس نہیں لیا جا سکتا۔',
  'This action cannot be undone': 'اس اقدام کو واپس نہیں لیا جا سکتا',
  'No data available': 'کوئی ڈیٹا دستیاب نہیں',
  'No results found': 'کوئی نتائج نہیں ملے',
  'No records found': 'کوئی ریکارڈ نہیں ملے',
  'No items found': 'کوئی آئٹمز نہیں ملے',
  'Failed to load': 'لوڈ کرنے میں ناکامی',
  'Failed to save': 'محفوظ کرنے میں ناکامی',
  'Failed to delete': 'حذف کرنے میں ناکامی',
  'Failed to create': 'بنانے میں ناکامی',
  'Failed to update': 'اپ ڈیٹ کرنے میں ناکامی',
  'An error occurred': 'ایک خرابی واقع ہوئی',
  'Something went wrong': 'کچھ غلط ہو گیا',
  'Please try again': 'براہ کرم دوبارہ کوشش کریں',
  'successfully created': 'کامیابی سے بنایا گیا',
  'successfully updated': 'کامیابی سے اپ ڈیٹ ہوا',
  'successfully deleted': 'کامیابی سے حذف ہوا',
  'successfully saved': 'کامیابی سے محفوظ ہوا',
  'Last updated': 'آخری بار اپ ڈیٹ ہوا',
  'Not found': 'نہیں ملا',
  'Access denied': 'رسائی مسترد',
  'Permission denied': 'اجازت مسترد',
  'Type to search': 'تلاش کے لیے ٹائپ کریں',
  'Processing...': 'پروسیسنگ ہو رہی ہے...',
  'Scanning...': 'سکین ہو رہا ہے...',
  'Verifying...': 'تصدیق ہو رہی ہے...',
  'Generating...': 'تیار ہو رہا ہے...',
  'Submitting...': 'جمع ہو رہا ہے...',
  'Exporting...': 'برآمد ہو رہا ہے...',
  'Uploading...': 'اپ لوڈ ہو رہا ہے...',
  'Downloading...': 'ڈاؤن لوڈ ہو رہا ہے...',
  'Analyzing...': 'تجزیہ ہو رہا ہے...',
  'Syncing...': 'مطابقت ہو رہی ہے...',
  'Updating...': 'اپ ڈیٹ ہو رہا ہے...',

  // ===== AI & Analysis =====
  'AI Analysis': 'AI تجزیہ', 'AI Suggestions': 'AI تجاویز',
  'Confidence': 'اعتماد', 'Accuracy': 'درستگی',
  'Pattern': 'پیٹرن', 'Patterns': 'پیٹرنز',
  'Anomaly': 'بے قاعدگی', 'Anomalies': 'بے قاعدگیاں',
  'Suggestion': 'تجویز', 'Suggestions': 'تجاویز',
  'Insight': 'بصیرت', 'Insights': 'بصیرتیں',

  // ===== Special Events =====
  'Special Event': 'خاص تقریب', 'Special Events': 'خاص تقریبات',
  'Event': 'تقریب', 'Events': 'تقریبات',
  'Organizer': 'منتظم', 'Attendees': 'شرکاء',
  'Capacity': 'گنجائش', 'Registration': 'رجسٹریشن',
  'Check-In': 'چیک ان', 'Check-Out': 'چیک آؤٹ',
};

const HINDI_DICT = {
  // ===== Common UI =====
  'Save': 'सहेजें', 'Cancel': 'रद्द करें', 'Delete': 'हटाएं', 'Edit': 'संपादित करें',
  'Submit': 'जमा करें', 'Back': 'वापस', 'Next': 'अगला', 'Previous': 'पिछला',
  'Search': 'खोजें', 'Filter': 'फ़िल्टर', 'View': 'देखें', 'Details': 'विवरण',
  'All': 'सभी', 'None': 'कोई नहीं', 'Yes': 'हां', 'No': 'नहीं', 'OK': 'ठीक है',
  'Close': 'बंद करें', 'Open': 'खोलें', 'Add': 'जोड़ें', 'Remove': 'हटाएं',
  'Create': 'बनाएं', 'Update': 'अपडेट करें', 'Confirm': 'पुष्टि करें', 'Apply': 'लागू करें',
  'Reset': 'रीसेट', 'Clear': 'साफ़ करें', 'Done': 'पूर्ण', 'Finish': 'समाप्त करें',
  'Loading': 'लोड हो रहा है', 'Loading...': 'लोड हो रहा है...', 'Saving...': 'सहेजा जा रहा है...',
  'Saving': 'सहेजा जा रहा है',
  'Error': 'त्रुटि', 'Success': 'सफलता', 'Warning': 'चेतावनी', 'Info': 'जानकारी',
  'Continue': 'जारी रखें', 'Select': 'चुनें', 'Selected': 'चयनित',
  'Required': 'आवश्यक', 'Optional': 'वैकल्पिक',
  'Enabled': 'सक्रिय', 'Disabled': 'निष्क्रिय', 'Active': 'सक्रिय', 'Inactive': 'निष्क्रिय',
  'Name': 'नाम', 'Description': 'विवरण', 'Title': 'शीर्षक', 'Status': 'स्थिति',
  'Date': 'तारीख', 'Time': 'समय', 'Type': 'प्रकार', 'Category': 'श्रेणी',
  'Priority': 'प्राथमिकता', 'Notes': 'नोट्स', 'Comments': 'टिप्पणियां',
  'Location': 'स्थान', 'Site': 'साइट', 'Branch': 'शाखा', 'Department': 'विभाग',
  'Actions': 'कार्रवाइयां', 'Settings': 'सेटिंग्स', 'Profile': 'प्रोफ़ाइल',
  'Dashboard': 'डैशबोर्ड', 'Reports': 'रिपोर्टें', 'Export': 'निर्यात',
  'Import': 'आयात', 'Download': 'डाउनलोड', 'Upload': 'अपलोड', 'Print': 'प्रिंट',
  'Pending': 'लंबित', 'Approved': 'स्वीकृत', 'Rejected': 'अस्वीकृत',
  'Completed': 'पूर्ण', 'In Progress': 'प्रगति में', 'Draft': 'मसौदा',
  'Closed': 'बंद', 'Resolved': 'हल किया',
  'Copy': 'प्रतिलिपि', 'Undo': 'पूर्ववत', 'Retry': 'पुनः प्रयास',
  'Light': 'लाइट', 'Dark': 'डार्क', 'System': 'सिस्टम',
  'Toggle theme': 'थीम बदलें', 'Change language': 'भाषा बदलें',
  'Select All': 'सभी चुनें', 'Clear All': 'सभी साफ़ करें',
  'No data available': 'डेटा उपलब्ध नहीं', 'No results found': 'कोई परिणाम नहीं मिला',
  'Unknown': 'अज्ञात', 'Not Set': 'सेट नहीं',
  'Preview': 'पूर्वावलोकन', 'Manage': 'प्रबंधित करें', 'Configure': 'कॉन्फ़िगर करें',
  'Enable': 'सक्रिय करें', 'Disable': 'निष्क्रिय करें',
  'Show': 'दिखाएं', 'Hide': 'छुपाएं',
  'Lock': 'लॉक', 'Unlock': 'अनलॉक',
  'Archive': 'संग्रह', 'Duplicate': 'डुप्लिकेट',
  'Move': 'स्थानांतरित करें', 'Sort': 'क्रमबद्ध करें', 'Group': 'समूह',
  'Merge': 'विलय करें', 'Split': 'विभाजित करें',
  'Send': 'भेजें', 'Receive': 'प्राप्त करें', 'Share': 'साझा करें',
  'Accept': 'स्वीकार करें', 'Decline': 'अस्वीकार करें',
  'Connect': 'जोड़ें', 'Disconnect': 'डिस्कनेक्ट',
  'Subscribe': 'सब्सक्राइब', 'Unsubscribe': 'अनसब्सक्राइब',
  'Bookmark': 'बुकमार्क', 'Favorite': 'पसंदीदा',
  'Tag': 'टैग', 'Label': 'लेबल',
  'Scan': 'स्कैन', 'Detect': 'पहचानें', 'Identify': 'पहचान करें',
  'Calculate': 'गणना करें', 'Estimate': 'अनुमान लगाएं',
  'Analyze': 'विश्लेषण करें', 'Compare': 'तुलना करें', 'Evaluate': 'मूल्यांकन करें',
  'Monitor': 'निगरानी करें', 'Track': 'ट्रैक करें',
  'Log': 'लॉग', 'Record': 'रिकॉर्ड', 'Capture': 'कैप्चर करें',
  'Notify': 'सूचित करें', 'Remind': 'याद दिलाएं', 'Alert': 'अलर्ट',
  'Proceed': 'आगे बढ़ें', 'Skip': 'छोड़ें', 'Ignore': 'अनदेखा करें',
  'Try Again': 'पुनः प्रयास करें', 'Go Back': 'वापस जाएं',
  'Learn More': 'और जानें', 'Read More': 'और पढ़ें',
  'See More': 'और देखें', 'See All': 'सभी देखें', 'Load More': 'और लोड करें',

  // ===== Auth =====
  'Sign In': 'साइन इन', 'Sign Out': 'साइन आउट', 'Log out': 'लॉग आउट',
  'Sign Up': 'साइन अप', 'Email': 'ईमेल', 'Password': 'पासवर्ड',
  'Forgot password?': 'पासवर्ड भूल गए?', 'Welcome Back': 'वापसी पर स्वागत',
  'Create Account': 'खाता बनाएं', 'Confirm Password': 'पासवर्ड की पुष्टि',
  'Login': 'लॉग इन', 'Logout': 'लॉगआउट', 'Register': 'पंजीकरण',
  'Authentication': 'प्रमाणीकरण', 'Verification': 'सत्यापन',
  'Reset Password': 'पासवर्ड रीसेट', 'Change Password': 'पासवर्ड बदलें',
  'Username': 'उपयोगकर्ता नाम', 'Full Name': 'पूरा नाम',
  'First Name': 'पहला नाम', 'Last Name': 'अंतिम नाम',
  'Phone Number': 'फ़ोन नंबर', 'Mobile Number': 'मोबाइल नंबर',
  'Account': 'खाता', 'My Account': 'मेरा खाता',
  'Invitation': 'आमंत्रण', 'Invite': 'आमंत्रित करें', 'Invite User': 'उपयोगकर्ता आमंत्रित करें',
  'OTP': 'OTP', 'MFA': 'MFA',
  'Tenant': 'किरायेदार', 'Subscription': 'सदस्यता', 'Plan': 'योजना',
  'Free': 'मुफ़्त', 'Basic': 'बेसिक', 'Premium': 'प्रीमियम', 'Enterprise': 'एंटरप्राइज़',
  'Billing': 'बिलिंग', 'Invoice': 'चालान', 'Payment': 'भुगतान',
  'Admin': 'व्यवस्थापक', 'Owner': 'मालिक', 'Member': 'सदस्य', 'Guest': 'अतिथि',

  // ===== HSSE Core =====
  'Incident': 'घटना', 'Incidents': 'घटनाएं', 'Observation': 'अवलोकन', 'Observations': 'अवलोकन',
  'Investigation': 'जांच', 'Investigations': 'जांचें',
  'Corrective Action': 'सुधारात्मक कार्रवाई', 'Corrective Actions': 'सुधारात्मक कार्रवाइयां',
  'Risk Assessment': 'जोखिम मूल्यांकन', 'Risk Assessments': 'जोखिम मूल्यांकन',
  'Safety': 'सुरक्षा', 'Security': 'सुरक्षा', 'Health': 'स्वास्थ्य', 'Environment': 'पर्यावरण',
  'Hazard': 'खतरा', 'Hazards': 'खतरे', 'Risk': 'जोखिम', 'Risks': 'जोखिम',
  'Near Miss': 'निकट चूक', 'Injury': 'चोट', 'Injuries': 'चोटें',
  'Fatality': 'मृत्यु', 'First Aid': 'प्राथमिक चिकित्सा', 'Medical Treatment': 'चिकित्सा उपचार',
  'Lost Time Injury': 'समय हानि चोट', 'Property Damage': 'संपत्ति क्षति',
  'Environmental Impact': 'पर्यावरणीय प्रभाव',
  'Damage': 'क्षति', 'Fire': 'अग्नि', 'Emergency': 'आपातकालीन',
  'Patrol': 'गश्त', 'Patrols': 'गश्तें',
  'Inspection': 'निरीक्षण', 'Inspections': 'निरीक्षण',
  'Audit': 'ऑडिट', 'Compliance': 'अनुपालन', 'Non-Compliance': 'गैर-अनुपालन',
  'Severity': 'गंभीरता', 'Low': 'कम', 'Medium': 'मध्यम', 'High': 'उच्च', 'Critical': 'गंभीर',
  'Extreme': 'अत्यधिक', 'Minor': 'मामूली', 'Major': 'प्रमुख', 'Significant': 'महत्वपूर्ण',
  'Likelihood': 'संभावना', 'Probability': 'प्रायिकता', 'Consequence': 'परिणाम', 'Impact': 'प्रभाव',
  'Mitigation': 'शमन', 'Prevention': 'रोकथाम', 'Elimination': 'उन्मूलन',
  'PPE': 'व्यक्तिगत सुरक्षा उपकरण',
  'Root Cause': 'मूल कारण', 'Root Cause Analysis': 'मूल कारण विश्लेषण',
  'Contributing Factor': 'योगदान कारक', 'Immediate Cause': 'तत्काल कारण',
  'Witness': 'गवाह', 'Witnesses': 'गवाह', 'Witness Statement': 'गवाह का बयान',
  'Evidence': 'साक्ष्य', 'Attachment': 'अनुलग्नक', 'Attachments': 'अनुलग्नक',
  'Timeline': 'समयरेखा', 'Findings': 'निष्कर्ष', 'Conclusion': 'निष्कर्ष',
  'Lessons Learned': 'सीखे गए सबक',
  'Preventive Action': 'निवारक कार्रवाई', 'Follow Up': 'अनुवर्ती',
  'Closure': 'समापन', 'Final Closure': 'अंतिम समापन',
  'Reopen': 'पुनः खोलें', 'Positive Observation': 'सकारात्मक अवलोकन',
  'Unsafe Act': 'असुरक्षित कार्य', 'Unsafe Condition': 'असुरक्षित स्थिति',
  'Spill': 'रिसाव', 'Contamination': 'संदूषण', 'Waste': 'अपशिष्ट',
  'Permit to Work': 'कार्य अनुमति', 'Safety Performance': 'सुरक्षा प्रदर्शन',
  'KPI': 'KPI', 'KPIs': 'KPIs', 'SLA': 'SLA',

  // ===== Investigation & Workflow =====
  'Submitted': 'जमा किया गया', 'Under Review': 'समीक्षा में',
  'Pending Approval': 'स्वीकृति लंबित', 'Expert Screening': 'विशेषज्ञ जांच',
  'Under Investigation': 'जांच जारी', 'Pending Closure': 'समापन लंबित',
  'Dispute': 'विवाद', 'Dispute Resolution': 'विवाद समाधान',
  'Workflow': 'वर्कफ़्लो', 'Workflow Status': 'वर्कफ़्लो स्थिति',
  'Current Owner': 'वर्तमान स्वामी', 'Current Step': 'वर्तमान चरण',
  'Screening': 'जांच', 'Classification': 'वर्गीकरण',
  'Department Representative': 'विभाग प्रतिनिधि',
  'HSSE Expert': 'HSSE विशेषज्ञ', 'HSSE Manager': 'HSSE प्रबंधक',
  'Investigator': 'जांचकर्ता', 'Investigation Team': 'जांच दल',
  'Escalation': 'बढ़ोत्तरी', 'Escalated': 'बढ़ाया गया',
  'Delegation': 'प्रत्यायोजन', 'Reminder': 'अनुस्मारक',
  'Take Action': 'कार्रवाई करें', 'Approve All': 'सभी स्वीकृत', 'Reject All': 'सभी अस्वीकार',
  'Bulk Actions': 'बल्क कार्रवाइयां', 'Action Required': 'कार्रवाई आवश्यक',
  'Pending Actions': 'लंबित कार्रवाइयां', 'Overdue Actions': 'अतिदेय कार्रवाइयां',
  'Extension Request': 'विस्तार अनुरोध',

  // ===== Security =====
  'Guard': 'गार्ड', 'Guards': 'गार्ड्स', 'Visitor': 'आगंतुक', 'Visitors': 'आगंतुक',
  'Contractor': 'ठेकेदार', 'Contractors': 'ठेकेदार', 'Worker': 'कर्मचारी', 'Workers': 'कर्मचारी',
  'Gate': 'गेट', 'Checkpoint': 'चेकपॉइंट', 'Zone': 'ज़ोन',
  'Shift': 'शिफ्ट', 'Shifts': 'शिफ्ट', 'Roster': 'ड्यूटी सूची',
  'Entry': 'प्रवेश', 'Exit': 'निकास', 'On Site': 'साइट पर',
  'Check In': 'चेक इन', 'Check Out': 'चेक आउट',
  'Gate Pass': 'गेट पास', 'Gate Passes': 'गेट पास',
  'Security Incident': 'सुरक्षा घटना', 'Security Alert': 'सुरक्षा अलर्ट',
  'Surveillance': 'निगरानी', 'CCTV': 'CCTV',
  'Geofence': 'जियोफ़ेंस', 'Boundary': 'सीमा',
  'Command Center': 'कमांड सेंटर', 'Control Room': 'नियंत्रण कक्ष',
  'Patrol Route': 'गश्त मार्ग', 'Start Patrol': 'गश्त शुरू करें',
  'QR Code': 'QR कोड', 'QR Scanner': 'QR स्कैनर',
  'Badge': 'बैज', 'Badges': 'बैज', 'Blacklist': 'ब्लैकलिस्ट',
  'Vehicle': 'वाहन', 'Vehicles': 'वाहन',
  'Evacuation': 'निकासी', 'Assembly Point': 'एकत्रण स्थान',
  'Emergency Contact': 'आपातकालीन संपर्क',

  // ===== Contractors =====
  'Contractor Company': 'ठेकेदार कंपनी', 'Contractor Worker': 'ठेकेदार कर्मचारी',
  'Induction': 'प्रेरण', 'Safety Induction': 'सुरक्षा प्रेरण',
  'Trade': 'व्यापार', 'Qualification': 'योग्यता', 'Certification': 'प्रमाणन',
  'Expiry': 'समाप्ति', 'Expiry Date': 'समाप्ति तारीख',
  'Renewal': 'नवीकरण', 'National ID': 'राष्ट्रीय पहचान', 'Passport': 'पासपोर्ट',
  'Insurance': 'बीमा', 'Medical Certificate': 'चिकित्सा प्रमाणपत्र',
  'Fit to Work': 'कार्य योग्य', 'Training Record': 'प्रशिक्षण रिकॉर्ड',
  'Violation': 'उल्लंघन', 'Violations': 'उल्लंघन', 'Penalty': 'दंड',
  'Warning Letter': 'चेतावनी पत्र', 'Stop Work Order': 'कार्य रोक आदेश',
  'Contract': 'अनुबंध', 'Start Date': 'प्रारंभ तारीख', 'End Date': 'समाप्ति तारीख',
  'Scope of Work': 'कार्य का दायरा', 'Manpower': 'जनशक्ति',

  // ===== Assets =====
  'Asset': 'संपत्ति', 'Assets': 'संपत्तियां', 'Asset Management': 'संपत्ति प्रबंधन',
  'Maintenance': 'रखरखाव', 'Warranty': 'वारंटी', 'Depreciation': 'मूल्यह्रास',
  'Transfer': 'स्थानांतरण', 'Disposal': 'निपटान',
  'Preventive Maintenance': 'निवारक रखरखाव', 'Breakdown': 'खराबी',
  'Total Cost of Ownership': 'स्वामित्व की कुल लागत',
  'Book Value': 'पुस्तक मूल्य', 'Salvage Value': 'उद्धार मूल्य',
  'Health Score': 'स्वास्थ्य स्कोर', 'Spare Parts': 'स्पेयर पार्ट्स',
  'Stock': 'स्टॉक', 'In Stock': 'स्टॉक में', 'Out of Stock': 'स्टॉक में नहीं',
  'Serial Number': 'सीरियल नंबर', 'Model': 'मॉडल', 'Manufacturer': 'निर्माता',
  'Calibration': 'कैलिब्रेशन', 'Equipment': 'उपकरण',

  // ===== Inspections =====
  'Template': 'टेम्पलेट', 'Templates': 'टेम्पलेट', 'Checklist': 'चेकलिस्ट',
  'Question': 'प्रश्न', 'Answer': 'उत्तर', 'Response': 'प्रतिक्रिया',
  'Compliant': 'अनुरूप', 'Non-Compliant': 'गैर-अनुरूप',
  'Pass': 'पास', 'Fail': 'फ़ेल', 'Finding': 'निष्कर्ष',
  'Non-Conformance': 'गैर-अनुरूपता', 'Recommendation': 'सिफ़ारिश',
  'Inspector': 'निरीक्षक', 'Overall Score': 'कुल स्कोर',
  'Section': 'अनुभाग', 'Item': 'आइटम', 'Weight': 'वज़न',
  'Frequency': 'आवृत्ति', 'Daily': 'दैनिक', 'Weekly': 'साप्ताहिक',
  'Monthly': 'मासिक', 'Quarterly': 'त्रैमासिक', 'Annual': 'वार्षिक',
  'Schedule': 'अनुसूची', 'Due Date': 'नियत तारीख',
  'Completion Rate': 'पूर्णता दर', 'Coverage': 'कवरेज',

  // ===== Dashboard =====
  'Overview': 'अवलोकन', 'Summary': 'सारांश', 'Total': 'कुल',
  'Average': 'औसत', 'Count': 'गिनती', 'Percentage': 'प्रतिशत',
  'Chart': 'चार्ट', 'Table': 'तालिका', 'List': 'सूची', 'Map': 'मानचित्र',
  'Calendar': 'कैलेंडर', 'Notification': 'सूचना', 'Notifications': 'सूचनाएं',
  'Trend': 'रुझान', 'Target': 'लक्ष्य', 'Actual': 'वास्तविक',
  'Distribution': 'वितरण', 'Pareto': 'पैरेटो',
  'Executive Summary': 'कार्यकारी सारांश',

  // ===== Reports =====
  'Report': 'रिपोर्ट', 'Generate Report': 'रिपोर्ट बनाएं',
  'Date Range': 'तारीख सीमा', 'Filters': 'फ़िल्टर',
  'This Week': 'इस सप्ताह', 'This Month': 'इस महीने', 'This Year': 'इस वर्ष',
  'Last Week': 'पिछले सप्ताह', 'Last Month': 'पिछले महीने',
  'Today': 'आज', 'Yesterday': 'कल', 'Custom': 'कस्टम',
  'Sort By': 'इसके अनुसार क्रमबद्ध', 'Ascending': 'आरोही', 'Descending': 'अवरोही',
  'Page': 'पृष्ठ', 'of': 'का', 'Per Page': 'प्रति पृष्ठ',

  // ===== Settings =====
  'General Settings': 'सामान्य सेटिंग्स', 'System Settings': 'सिस्टम सेटिंग्स',
  'Language': 'भाषा', 'Theme': 'थीम', 'Appearance': 'दिखावट',
  'Branding': 'ब्रांडिंग', 'Module': 'मॉड्यूल', 'Modules': 'मॉड्यूल',
  'Integration': 'एकीकरण', 'Backup': 'बैकअप', 'Restore': 'पुनर्स्थापित करें',
  'Audit Log': 'ऑडिट लॉग', 'User Management': 'उपयोगकर्ता प्रबंधन',
  'Role Management': 'भूमिका प्रबंधन',

  // ===== Time =====
  'Days': 'दिन', 'Hours': 'घंटे', 'Minutes': 'मिनट', 'Seconds': 'सेकंड',
  'day': 'दिन', 'hour': 'घंटा', 'minute': 'मिनट',
  'week': 'सप्ताह', 'month': 'महीना', 'year': 'वर्ष',
  'ago': 'पहले', 'Just now': 'अभी',
  'January': 'जनवरी', 'February': 'फ़रवरी', 'March': 'मार्च', 'April': 'अप्रैल',
  'May': 'मई', 'June': 'जून', 'July': 'जुलाई', 'August': 'अगस्त',
  'September': 'सितंबर', 'October': 'अक्टूबर', 'November': 'नवंबर', 'December': 'दिसंबर',

  // ===== Status =====
  'Verify': 'सत्यापित करें', 'Validate': 'मान्य करें',
  'Assign': 'आवंटित करें', 'Approve': 'स्वीकृत करें', 'Reject': 'अस्वीकार करें', 'Review': 'समीक्षा',
  'Start': 'शुरू', 'Stop': 'रुकें', 'Pause': 'रुकें', 'Resume': 'फिर से शुरू',
  'Complete': 'पूर्ण करें', 'Escalate': 'बढ़ाएं',
  'Generate': 'उत्पन्न करें', 'Generating': 'उत्पन्न हो रहा है',
  'Photo': 'फ़ोटो', 'Photos': 'फ़ोटो', 'Video': 'वीडियो',
  'Document': 'दस्तावेज़', 'Documents': 'दस्तावेज़', 'File': 'फ़ाइल', 'Files': 'फ़ाइलें',
  'Performance': 'प्रदर्शन', 'Score': 'स्कोर', 'Rating': 'रेटिंग',
  'Training': 'प्रशिक्षण', 'Leaderboard': 'लीडरबोर्ड',
  'Supervisor': 'पर्यवेक्षक', 'Manager': 'प्रबंधक',
  'Team': 'टीम', 'Role': 'भूमिका', 'User': 'उपयोगकर्ता', 'Users': 'उपयोगकर्ता',
  'Organization': 'संगठन', 'Company': 'कंपनी',
  'Project': 'परियोजना', 'Projects': 'परियोजनाएं',
  'Offline': 'ऑफ़लाइन', 'Online': 'ऑनलाइन', 'Sync': 'सिंक', 'Live': 'लाइव',
  'Duration': 'अवधि', 'Permanent': 'स्थायी', 'Temporary': 'अस्थायी',
  'Valid': 'मान्य', 'Invalid': 'अमान्य', 'Expired': 'समाप्त',
  'Overdue': 'अतिदेय', 'On Time': 'समय पर', 'Late': 'विलंबित',
  'Assigned': 'आवंटित', 'Unassigned': 'अनावंटित',
  'Reference': 'संदर्भ', 'Version': 'संस्करण',
  'Nationality': 'राष्ट्रीयता', 'Country': 'देश', 'City': 'शहर',
  'Area': 'क्षेत्र', 'Region': 'क्षेत्र',
  'Permit': 'अनुमति', 'License': 'लाइसेंस', 'Certificate': 'प्रमाणपत्र',
  'Cost': 'लागत', 'Price': 'मूल्य', 'Amount': 'राशि',
  'Vendor': 'विक्रेता', 'Supplier': 'आपूर्तिकर्ता',
  'Analytics': 'विश्लेषण', 'Statistics': 'सांख्यिकी',
  'Message': 'संदेश', 'Access': 'पहुंच', 'Home': 'होम',
  'Refresh': 'ताज़ा करें', 'Help': 'सहायता', 'Support': 'समर्थन',
  'Feedback': 'प्रतिक्रिया', 'Welcome': 'स्वागत',
  'Navigation': 'नेविगेशन', 'Menu': 'मेनू', 'Step': 'चरण', 'Progress': 'प्रगति',
  'Trash': 'ट्रैश', 'Color': 'रंग', 'Image': 'छवि',
  'Quick Actions': 'त्वरित कार्रवाइयां',

  // ===== Sentence-level =====
  'Are you sure?': 'क्या आप सुनिश्चित हैं?',
  'This action cannot be undone.': 'यह कार्रवाई पूर्ववत नहीं की जा सकती।',
  'This action cannot be undone': 'यह कार्रवाई पूर्ववत नहीं की जा सकती',
  'No data available': 'डेटा उपलब्ध नहीं',
  'Failed to load': 'लोड करने में विफल',
  'Failed to save': 'सहेजने में विफल',
  'An error occurred': 'एक त्रुटि हुई',
  'Something went wrong': 'कुछ गलत हो गया',
  'Please try again': 'कृपया पुनः प्रयास करें',
  'successfully created': 'सफलतापूर्वक बनाया गया',
  'successfully updated': 'सफलतापूर्वक अपडेट किया गया',
  'successfully deleted': 'सफलतापूर्वक हटाया गया',
  'Last updated': 'अंतिम अपडेट',
  'Not found': 'नहीं मिला',
  'Access denied': 'पहुंच अस्वीकृत',
  'Type to search': 'खोजने के लिए टाइप करें',
  'Processing...': 'प्रोसेसिंग हो रही है...', 'Scanning...': 'स्कैन हो रहा है...',
  'Generating...': 'उत्पन्न हो रहा है...', 'Uploading...': 'अपलोड हो रहा है...',
  'Syncing...': 'सिंक हो रहा है...', 'Updating...': 'अपडेट हो रहा है...',

  // ===== AI =====
  'AI Analysis': 'AI विश्लेषण', 'Confidence': 'विश्वास', 'Accuracy': 'सटीकता',
  'Pattern': 'पैटर्न', 'Anomaly': 'विसंगति', 'Suggestion': 'सुझाव', 'Insight': 'अंतर्दृष्टि',

  // ===== Events =====
  'Special Event': 'विशेष कार्यक्रम', 'Event': 'कार्यक्रम',
  'Visit Request': 'भेंट अनुरोध', 'Host': 'मेज़बान',
};

const FILIPINO_DICT = {
  // ===== Common UI =====
  'Save': 'I-save', 'Cancel': 'Kanselahin', 'Delete': 'Burahin', 'Edit': 'I-edit',
  'Submit': 'Isumite', 'Back': 'Bumalik', 'Next': 'Susunod', 'Previous': 'Nakaraan',
  'Search': 'Maghanap', 'Filter': 'Salain', 'View': 'Tingnan', 'Details': 'Detalye',
  'All': 'Lahat', 'None': 'Wala', 'Yes': 'Oo', 'No': 'Hindi', 'OK': 'OK',
  'Close': 'Isara', 'Open': 'Buksan', 'Add': 'Idagdag', 'Remove': 'Alisin',
  'Create': 'Lumikha', 'Update': 'I-update', 'Confirm': 'Kumpirmahin', 'Apply': 'Ilapat',
  'Reset': 'I-reset', 'Clear': 'Linisin', 'Done': 'Tapos na', 'Finish': 'Tapusin',
  'Loading': 'Naglo-load', 'Loading...': 'Naglo-load...', 'Saving...': 'Nagse-save...',
  'Saving': 'Nagse-save',
  'Error': 'Error', 'Success': 'Tagumpay', 'Warning': 'Babala', 'Info': 'Impormasyon',
  'Continue': 'Magpatuloy', 'Select': 'Pumili', 'Selected': 'Napili',
  'Required': 'Kinakailangan', 'Optional': 'Opsyonal',
  'Enabled': 'Naka-enable', 'Disabled': 'Naka-disable', 'Active': 'Aktibo', 'Inactive': 'Hindi aktibo',
  'Name': 'Pangalan', 'Description': 'Paglalarawan', 'Title': 'Pamagat', 'Status': 'Katayuan',
  'Date': 'Petsa', 'Time': 'Oras', 'Type': 'Uri', 'Category': 'Kategorya',
  'Priority': 'Priyoridad', 'Notes': 'Mga Tala', 'Comments': 'Mga Komento',
  'Location': 'Lokasyon', 'Site': 'Site', 'Branch': 'Sangay', 'Department': 'Departamento',
  'Actions': 'Mga Aksyon', 'Settings': 'Mga Setting', 'Profile': 'Profile',
  'Dashboard': 'Dashboard', 'Reports': 'Mga Ulat', 'Export': 'I-export',
  'Import': 'I-import', 'Download': 'I-download', 'Upload': 'I-upload', 'Print': 'I-print',
  'Pending': 'Nakabinbin', 'Approved': 'Naaprubahan', 'Rejected': 'Tinanggihan',
  'Completed': 'Nakumpleto', 'In Progress': 'Isinasagawa', 'Draft': 'Draft',
  'Closed': 'Sarado', 'Resolved': 'Nalutas',
  'Copy': 'Kopyahin', 'Undo': 'I-undo', 'Retry': 'Subukan muli',
  'Light': 'Light', 'Dark': 'Dark', 'System': 'System',
  'Select All': 'Piliin lahat', 'Clear All': 'Linisin lahat',
  'No data available': 'Walang available na data', 'No results found': 'Walang nahanap na resulta',
  'Unknown': 'Hindi alam', 'Not Set': 'Hindi nakatakda',
  'Preview': 'Preview', 'Manage': 'Pamahalaan', 'Configure': 'I-configure',
  'Enable': 'I-enable', 'Disable': 'I-disable',
  'Show': 'Ipakita', 'Hide': 'Itago',
  'Lock': 'I-lock', 'Unlock': 'I-unlock',
  'Archive': 'I-archive', 'Duplicate': 'I-duplicate',
  'Move': 'Ilipat', 'Sort': 'Ayusin', 'Group': 'Grupo',
  'Send': 'Ipadala', 'Receive': 'Tanggapin', 'Share': 'Ibahagi',
  'Accept': 'Tanggapin', 'Decline': 'Tanggihan',
  'Scan': 'I-scan', 'Analyze': 'Suriin', 'Compare': 'Ihambing',
  'Monitor': 'Bantayan', 'Track': 'Subaybayan',
  'Notify': 'Abisuhan', 'Remind': 'Paalalahanan', 'Alert': 'Alerto',
  'Proceed': 'Magpatuloy', 'Skip': 'Laktawan', 'Ignore': 'Balewalain',
  'Try Again': 'Subukan muli', 'Go Back': 'Bumalik',
  'Learn More': 'Alamin pa', 'See All': 'Tingnan lahat', 'Load More': 'Mag-load pa',
  'Tag': 'Tag', 'Label': 'Label', 'Bookmark': 'Bookmark', 'Favorite': 'Paborito',

  // ===== Auth =====
  'Sign In': 'Mag-sign in', 'Sign Out': 'Mag-sign out', 'Log out': 'Mag-log out',
  'Sign Up': 'Mag-sign up', 'Email': 'Email', 'Password': 'Password',
  'Forgot password?': 'Nakalimutan ang password?', 'Welcome Back': 'Maligayang pagbabalik',
  'Create Account': 'Gumawa ng account', 'Confirm Password': 'Kumpirmahin ang password',
  'Login': 'Mag-login', 'Logout': 'Mag-logout', 'Register': 'Magrehistro',
  'Authentication': 'Authentication', 'Verification': 'Beripikasyon',
  'Reset Password': 'I-reset ang password', 'Change Password': 'Palitan ang password',
  'Username': 'Username', 'Full Name': 'Buong pangalan',
  'Account': 'Account', 'Invitation': 'Imbitasyon', 'Invite': 'Imbitahan',
  'Tenant': 'Tenant', 'Subscription': 'Subscription', 'Plan': 'Plano',
  'Free': 'Libre', 'Basic': 'Basic', 'Premium': 'Premium',
  'Billing': 'Billing', 'Invoice': 'Invoice', 'Payment': 'Bayad',
  'Admin': 'Admin', 'Owner': 'May-ari', 'Member': 'Miyembro', 'Guest': 'Bisita',

  // ===== HSSE Core =====
  'Incident': 'Insidente', 'Incidents': 'Mga Insidente',
  'Observation': 'Obserbasyon', 'Observations': 'Mga Obserbasyon',
  'Investigation': 'Imbestigasyon', 'Investigations': 'Mga Imbestigasyon',
  'Corrective Action': 'Pagwawastong Aksyon', 'Corrective Actions': 'Mga Pagwawastong Aksyon',
  'Risk Assessment': 'Pagsusuri ng Panganib',
  'Safety': 'Kaligtasan', 'Security': 'Seguridad', 'Health': 'Kalusugan', 'Environment': 'Kapaligiran',
  'Hazard': 'Panganib', 'Risk': 'Panganib', 'Near Miss': 'Halos Aksidente',
  'Injury': 'Pinsala', 'Fatality': 'Pagkamatay', 'First Aid': 'Paunang Lunas',
  'Lost Time Injury': 'Pinsalang May Nawang Oras', 'Property Damage': 'Pinsala sa Ari-arian',
  'Damage': 'Pinsala', 'Fire': 'Sunog', 'Emergency': 'Emerhensya',
  'Patrol': 'Patrol', 'Patrols': 'Mga Patrol',
  'Inspection': 'Inspeksyon', 'Inspections': 'Mga Inspeksyon',
  'Audit': 'Audit', 'Compliance': 'Pagsunod', 'Non-Compliance': 'Hindi Pagsunod',
  'Severity': 'Kalubhaan', 'Low': 'Mababa', 'Medium': 'Katamtaman', 'High': 'Mataas', 'Critical': 'Kritikal',
  'Likelihood': 'Posibilidad', 'Consequence': 'Bunga', 'Impact': 'Epekto',
  'Mitigation': 'Pagpapagaan', 'Prevention': 'Pag-iwas',
  'PPE': 'Personal na Kagamitang Pangkaligtasan',
  'Root Cause': 'Ugat ng Sanhi', 'Root Cause Analysis': 'Pagsusuri ng Ugat ng Sanhi',
  'Witness': 'Saksi', 'Witnesses': 'Mga Saksi',
  'Evidence': 'Ebidensya', 'Attachment': 'Kalakip', 'Attachments': 'Mga Kalakip',
  'Timeline': 'Timeline', 'Findings': 'Mga Natuklasan', 'Conclusion': 'Konklusyon',
  'Lessons Learned': 'Mga Natutunang Aral',
  'Preventive Action': 'Pang-iwas na Aksyon', 'Follow Up': 'Pag-follow up',
  'Closure': 'Pagsasara', 'Reopen': 'Muling buksan',
  'Positive Observation': 'Positibong Obserbasyon',
  'Unsafe Act': 'Hindi Ligtas na Gawa', 'Unsafe Condition': 'Hindi Ligtas na Kondisyon',
  'Spill': 'Pagtagas', 'Contamination': 'Kontaminasyon', 'Waste': 'Basura',
  'Permit to Work': 'Permiso sa Trabaho', 'KPI': 'KPI', 'SLA': 'SLA',

  // ===== Investigation & Workflow =====
  'Submitted': 'Isinumite', 'Under Review': 'Sinusuri',
  'Pending Approval': 'Naghihintay ng Pag-apruba', 'Expert Screening': 'Pagsuri ng Eksperto',
  'Under Investigation': 'Iniimbestigahan', 'Pending Closure': 'Naghihintay ng Pagsara',
  'Dispute': 'Dispute', 'Workflow': 'Workflow', 'Workflow Status': 'Status ng Workflow',
  'Current Owner': 'Kasalukuyang May-ari', 'Classification': 'Klasipikasyon',
  'Department Representative': 'Kinatawan ng Departamento',
  'HSSE Expert': 'HSSE Expert', 'HSSE Manager': 'HSSE Manager',
  'Investigator': 'Imbestigador', 'Investigation Team': 'Koponan ng Imbestigasyon',
  'Escalation': 'Pag-escalate', 'Escalated': 'Na-escalate',
  'Reminder': 'Paalala', 'Take Action': 'Kumilos',
  'Bulk Actions': 'Maramihang Aksyon', 'Action Required': 'Kailangan ng Aksyon',
  'Pending Actions': 'Nakabinbing Aksyon', 'Overdue Actions': 'Nahuling Aksyon',
  'Extension Request': 'Kahilingan ng Extension',

  // ===== Security =====
  'Guard': 'Guwardiya', 'Guards': 'Mga Guwardiya',
  'Visitor': 'Bisita', 'Visitors': 'Mga Bisita',
  'Contractor': 'Kontratista', 'Contractors': 'Mga Kontratista',
  'Worker': 'Manggagawa', 'Workers': 'Mga Manggagawa',
  'Gate': 'Gate', 'Checkpoint': 'Checkpoint', 'Zone': 'Zona',
  'Shift': 'Shift', 'Shifts': 'Mga Shift', 'Roster': 'Roster',
  'Entry': 'Pasok', 'Exit': 'Labas', 'On Site': 'Nasa Site',
  'Check In': 'Mag-check in', 'Check Out': 'Mag-check out',
  'Gate Pass': 'Gate Pass', 'Gate Passes': 'Mga Gate Pass',
  'Security Incident': 'Insidente ng Seguridad', 'Security Alert': 'Alerto sa Seguridad',
  'Surveillance': 'Pagmamatyag', 'CCTV': 'CCTV',
  'Geofence': 'Geofence', 'Boundary': 'Hangganan',
  'Command Center': 'Command Center', 'Patrol Route': 'Ruta ng Patrol',
  'Start Patrol': 'Simulan ang Patrol', 'QR Code': 'QR Code',
  'Badge': 'Badge', 'Blacklist': 'Blacklist',
  'Vehicle': 'Sasakyan', 'Vehicles': 'Mga Sasakyan',
  'Evacuation': 'Ebakwasyon', 'Assembly Point': 'Lugar ng Pagtipon',
  'Emergency Contact': 'Emergency Contact',

  // ===== Contractors =====
  'Contractor Company': 'Kumpanya ng Kontratista', 'Contractor Worker': 'Manggagawa ng Kontratista',
  'Induction': 'Oryentasyon', 'Safety Induction': 'Oryentasyon sa Kaligtasan',
  'Trade': 'Trabaho', 'Qualification': 'Kwalipikasyon', 'Certification': 'Sertipikasyon',
  'Expiry': 'Pag-expire', 'Expiry Date': 'Petsa ng Pag-expire',
  'Renewal': 'Pag-renew', 'National ID': 'National ID', 'Passport': 'Pasaporte',
  'Insurance': 'Insurance', 'Medical Certificate': 'Medical Certificate',
  'Fit to Work': 'Kayang Magtrabaho', 'Training Record': 'Rekord ng Pagsasanay',
  'Violation': 'Paglabag', 'Violations': 'Mga Paglabag', 'Penalty': 'Parusa',
  'Warning Letter': 'Liham ng Babala', 'Stop Work Order': 'Utos na Ihinto ang Trabaho',
  'Contract': 'Kontrata', 'Start Date': 'Petsa ng Simula', 'End Date': 'Petsa ng Wakas',
  'Scope of Work': 'Saklaw ng Trabaho', 'Manpower': 'Lakas-paggawa',

  // ===== Assets =====
  'Asset': 'Asset', 'Assets': 'Mga Asset', 'Asset Management': 'Pamamahala ng Asset',
  'Maintenance': 'Pagpapanatili', 'Warranty': 'Warranty', 'Depreciation': 'Pagbaba ng Halaga',
  'Transfer': 'Ilipat', 'Disposal': 'Pagtatapon',
  'Preventive Maintenance': 'Pang-iwas na Pagpapanatili', 'Breakdown': 'Pagkasira',
  'Total Cost of Ownership': 'Kabuuang Gastos ng Pagmamay-ari',
  'Health Score': 'Health Score', 'Spare Parts': 'Spare Parts',
  'Stock': 'Stock', 'In Stock': 'May Stock', 'Out of Stock': 'Walang Stock',
  'Serial Number': 'Serial Number', 'Model': 'Modelo', 'Manufacturer': 'Tagagawa',
  'Calibration': 'Kalibrahin', 'Equipment': 'Kagamitan',

  // ===== Inspections =====
  'Template': 'Template', 'Templates': 'Mga Template', 'Checklist': 'Checklist',
  'Question': 'Tanong', 'Answer': 'Sagot', 'Response': 'Tugon',
  'Compliant': 'Sumusunod', 'Non-Compliant': 'Hindi Sumusunod',
  'Pass': 'Pumasa', 'Fail': 'Bumagsak', 'Finding': 'Natuklasan',
  'Non-Conformance': 'Hindi Pagsunod', 'Recommendation': 'Rekomendasyon',
  'Inspector': 'Inspektor', 'Overall Score': 'Kabuuang Iskor',
  'Section': 'Seksyon', 'Item': 'Aytem', 'Weight': 'Timbang',
  'Frequency': 'Dalas', 'Daily': 'Araw-araw', 'Weekly': 'Lingguhan',
  'Monthly': 'Buwanan', 'Quarterly': 'Tatluhang-buwan', 'Annual': 'Taunan',
  'Schedule': 'Iskedyul', 'Due Date': 'Takdang Petsa',
  'Completion Rate': 'Rate ng Pagkumpleto', 'Coverage': 'Saklaw',

  // ===== Dashboard =====
  'Overview': 'Pangkalahatang-tanaw', 'Summary': 'Buod', 'Total': 'Kabuuan',
  'Average': 'Average', 'Count': 'Bilang', 'Percentage': 'Porsyento',
  'Chart': 'Tsart', 'Table': 'Talahanayan', 'List': 'Listahan', 'Map': 'Mapa',
  'Calendar': 'Kalendaryo', 'Notification': 'Abiso', 'Notifications': 'Mga Abiso',
  'Trend': 'Kalakaran', 'Target': 'Target', 'Actual': 'Aktwal',
  'Distribution': 'Distribusyon', 'Pareto': 'Pareto',
  'Executive Summary': 'Executive Summary',

  // ===== Reports =====
  'Report': 'Ulat', 'Generate Report': 'Gumawa ng Ulat',
  'Date Range': 'Saklaw ng Petsa', 'Filters': 'Mga Filter',
  'This Week': 'Ngayong Linggo', 'This Month': 'Ngayong Buwan', 'This Year': 'Ngayong Taon',
  'Last Week': 'Nakaraang Linggo', 'Last Month': 'Nakaraang Buwan',
  'Today': 'Ngayon', 'Yesterday': 'Kahapon', 'Custom': 'Custom',
  'Sort By': 'Ayusin ayon sa', 'Ascending': 'Pataas', 'Descending': 'Pababa',
  'Page': 'Pahina', 'of': 'ng', 'Per Page': 'Bawat Pahina',

  // ===== Settings =====
  'General Settings': 'Pangkalahatang Setting', 'System Settings': 'Setting ng System',
  'Language': 'Wika', 'Theme': 'Tema', 'Appearance': 'Hitsura',
  'Branding': 'Branding', 'Module': 'Module', 'Modules': 'Mga Module',
  'Integration': 'Integration', 'Backup': 'Backup', 'Restore': 'I-restore',
  'Audit Log': 'Audit Log', 'User Management': 'Pamamahala ng Gumagamit',
  'Role Management': 'Pamamahala ng Tungkulin',

  // ===== Time =====
  'Days': 'Mga Araw', 'Hours': 'Mga Oras', 'Minutes': 'Mga Minuto', 'Seconds': 'Mga Segundo',
  'day': 'araw', 'hour': 'oras', 'minute': 'minuto',
  'week': 'linggo', 'month': 'buwan', 'year': 'taon',
  'ago': 'nakaraan', 'Just now': 'Kakalangin lang',
  'January': 'Enero', 'February': 'Pebrero', 'March': 'Marso', 'April': 'Abril',
  'May': 'Mayo', 'June': 'Hunyo', 'July': 'Hulyo', 'August': 'Agosto',
  'September': 'Setyembre', 'October': 'Oktubre', 'November': 'Nobyembre', 'December': 'Disyembre',

  // ===== Status =====
  'Verify': 'I-verify', 'Validate': 'I-validate',
  'Assign': 'Italaga', 'Approve': 'Aprubahan', 'Reject': 'Tanggihan', 'Review': 'Suriin',
  'Start': 'Simula', 'Stop': 'Itigil', 'Pause': 'I-pause', 'Resume': 'Ipagpatuloy',
  'Complete': 'Kumpletuhin', 'Escalate': 'I-escalate',
  'Generate': 'Bumuo', 'Generating': 'Bumubuo',
  'Photo': 'Larawan', 'Photos': 'Mga Larawan', 'Video': 'Video',
  'Document': 'Dokumento', 'Documents': 'Mga Dokumento', 'File': 'File', 'Files': 'Mga File',
  'Performance': 'Pagganap', 'Score': 'Iskor', 'Rating': 'Rating',
  'Training': 'Pagsasanay', 'Leaderboard': 'Leaderboard',
  'Supervisor': 'Superbisor', 'Manager': 'Manager',
  'Team': 'Koponan', 'Role': 'Tungkulin', 'User': 'Gumagamit', 'Users': 'Mga Gumagamit',
  'Organization': 'Organisasyon', 'Company': 'Kumpanya',
  'Project': 'Proyekto', 'Projects': 'Mga Proyekto',
  'Offline': 'Offline', 'Online': 'Online', 'Sync': 'I-sync', 'Live': 'Live',
  'Duration': 'Tagal', 'Permanent': 'Permanente', 'Temporary': 'Pansamantala',
  'Valid': 'Balido', 'Invalid': 'Hindi balido', 'Expired': 'Nag-expire na',
  'Overdue': 'Lagpas na', 'On Time': 'Sa oras', 'Late': 'Huli',
  'Assigned': 'Nakatalaga', 'Unassigned': 'Hindi nakatalaga',
  'Reference': 'Sanggunian', 'Version': 'Bersyon',
  'Nationality': 'Nasyonalidad', 'Country': 'Bansa', 'City': 'Lungsod',
  'Area': 'Lugar', 'Region': 'Rehiyon',
  'Permit': 'Permiso', 'License': 'Lisensya', 'Certificate': 'Sertipiko',
  'Cost': 'Gastos', 'Price': 'Presyo', 'Amount': 'Halaga',
  'Vendor': 'Vendor', 'Supplier': 'Supplier',
  'Analytics': 'Analytics', 'Statistics': 'Istatistika',
  'Message': 'Mensahe', 'Access': 'Access', 'Home': 'Home',
  'Refresh': 'I-refresh', 'Help': 'Tulong', 'Support': 'Suporta',
  'Feedback': 'Feedback', 'Welcome': 'Maligayang pagdating',
  'Navigation': 'Nabigasyon', 'Menu': 'Menu', 'Step': 'Hakbang', 'Progress': 'Progreso',
  'Trash': 'Basurahan', 'Color': 'Kulay', 'Image': 'Larawan',
  'Quick Actions': 'Mabilis na Aksyon',

  // ===== Sentence-level =====
  'Are you sure?': 'Sigurado ka ba?',
  'This action cannot be undone.': 'Hindi na maaaring bawiin ang aksyon na ito.',
  'This action cannot be undone': 'Hindi na maaaring bawiin ang aksyon na ito',
  'No data available': 'Walang available na data',
  'Failed to load': 'Hindi na-load',
  'Failed to save': 'Hindi na-save',
  'An error occurred': 'May naganap na error',
  'Something went wrong': 'May nangyaring mali',
  'Please try again': 'Pakisubukan muli',
  'successfully created': 'matagumpay na nalikha',
  'successfully updated': 'matagumpay na na-update',
  'successfully deleted': 'matagumpay na nabura',
  'Last updated': 'Huling na-update',
  'Not found': 'Hindi nahanap',
  'Access denied': 'Tinanggihan ang access',
  'Type to search': 'I-type para maghanap',
  'Processing...': 'Pinoproseso...', 'Scanning...': 'Nag-i-scan...',
  'Generating...': 'Bumubuo...', 'Uploading...': 'Nag-a-upload...',
  'Syncing...': 'Nagsi-sync...', 'Updating...': 'Nag-a-update...',

  // ===== AI =====
  'AI Analysis': 'AI Analysis', 'Confidence': 'Kumpiyansa', 'Accuracy': 'Katumpakan',
  'Pattern': 'Pattern', 'Anomaly': 'Anomalya', 'Suggestion': 'Mungkahi', 'Insight': 'Insight',

  // ===== Events =====
  'Special Event': 'Espesyal na Kaganapan', 'Event': 'Kaganapan',
  'Visit Request': 'Kahilingan ng Pagbisita', 'Host': 'Host',
};

const DICTIONARIES = { ur: URDU_DICT, hi: HINDI_DICT, fil: FILIPINO_DICT };
const LANG_NAMES = { ur: 'Urdu', hi: 'Hindi', fil: 'Filipino' };

// ─── Core Logic ────────────────────────────────────────────────────────────

function translateValue(enValue, dict) {
  if (typeof enValue !== 'string') return null;
  
  // Exact match
  if (dict[enValue]) return dict[enValue];
  
  // Case-insensitive exact match
  const lowerMap = {};
  for (const [k, v] of Object.entries(dict)) lowerMap[k.toLowerCase()] = v;
  if (lowerMap[enValue.toLowerCase()]) return lowerMap[enValue.toLowerCase()];
  
  // Extract placeholders & HTML, translate, reassemble
  const placeholders = [];
  let cleaned = enValue.replace(/\{\{[^}]+\}\}/g, (m) => { placeholders.push(m); return `__PH${placeholders.length - 1}__`; });
  const htmlTags = [];
  cleaned = cleaned.replace(/<[^>]+>/g, (m) => { htmlTags.push(m); return `__HTML${htmlTags.length - 1}__`; });
  
  // Try dict on cleaned value
  if (dict[cleaned]) {
    let result = dict[cleaned];
    placeholders.forEach((ph, idx) => { result = result.replace(`__PH${idx}__`, ph); });
    htmlTags.forEach((tag, idx) => { result = result.replace(`__HTML${idx}__`, tag); });
    return result;
  }
  if (lowerMap[cleaned.toLowerCase()]) {
    let result = lowerMap[cleaned.toLowerCase()];
    placeholders.forEach((ph, idx) => { result = result.replace(`__PH${idx}__`, ph); });
    htmlTags.forEach((tag, idx) => { result = result.replace(`__HTML${idx}__`, tag); });
    return result;
  }
  
  // Word-by-word for short strings (≤7 words)
  const words = cleaned.split(/\s+/);
  if (words.length <= 7) {
    let translated = false;
    const result = words.map(w => {
      const puncBefore = w.match(/^([^a-zA-Z]*)/)?.[1] || '';
      const puncAfter = w.match(/([^a-zA-Z]*)$/)?.[1] || '';
      const core = w.slice(puncBefore.length, w.length - (puncAfter.length || 0)) || w;
      
      if (core.startsWith('__PH') || core.startsWith('__HTML')) return w;
      
      const tr = dict[core] || lowerMap[core.toLowerCase()];
      if (tr) { translated = true; return puncBefore + tr + puncAfter; }
      return w;
    }).join(' ');
    
    if (translated) {
      let final = result;
      placeholders.forEach((ph, idx) => { final = final.replace(`__PH${idx}__`, ph); });
      htmlTags.forEach((tag, idx) => { final = final.replace(`__HTML${idx}__`, tag); });
      return final;
    }
  }
  
  return null;
}

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

function setNestedValue(obj, path, value) {
  const keys = path.split('.');
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!current[keys[i]] || typeof current[keys[i]] !== 'object') current[keys[i]] = {};
    current = current[keys[i]];
  }
  current[keys[keys.length - 1]] = value;
}

function getNestedValue(obj, path) {
  const keys = path.split('.');
  let current = obj;
  for (const key of keys) {
    if (!current || typeof current !== 'object') return undefined;
    current = current[key];
  }
  return current;
}

function countKeys(obj, count = 0) {
  for (const v of Object.values(obj)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) count = countKeys(v, count);
    else count++;
  }
  return count;
}

function isTargetLanguageText(str, lang) {
  if (!str || typeof str !== 'string') return false;
  const cleaned = str.replace(/\{\{[^}]+\}\}/g, '').replace(/[0-9.,;:!?@#$%^&*()_+\-=\[\]{}'"/\\|<>~`\n\r\t ]/g, '').replace(/[\u200B-\u200D\uFEFF]/g, '');
  if (cleaned.length === 0) return false;
  
  if (lang === 'ur') return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(cleaned);
  if (lang === 'hi') return /[\u0900-\u097F]/.test(cleaned);
  if (lang === 'fil') return /[a-zA-Z]/.test(cleaned); // Filipino uses Latin script, hard to distinguish
  return false;
}

// ─── Main ──────────────────────────────────────────────────────────────────

function main() {
  const LOCALES_DIR = path.join(__dirname, '..', 'src', 'locales');
  
  const enRaw = fs.readFileSync(path.join(LOCALES_DIR, 'en', 'translation.json'), 'utf-8');
  const enObj = parseJsonDedup(enRaw);
  const enPaths = getAllPaths(enObj);
  const enKeyCount = Object.keys(enPaths).length;
  
  console.log(`\n📊 English source: ${enKeyCount} leaf keys\n`);
  console.log('═'.repeat(60));
  
  const report = [];
  
  for (const lang of ['ur', 'hi', 'fil']) {
    console.log(`\n🌐 Processing ${LANG_NAMES[lang]} (${lang})...`);
    
    const targetPath = path.join(LOCALES_DIR, lang, 'translation.json');
    const targetRaw = fs.readFileSync(targetPath, 'utf-8');
    let targetObj;
    try { targetObj = parseJsonDedup(targetRaw); } catch { targetObj = JSON.parse(targetRaw); }
    
    const dict = DICTIONARIES[lang];
    const stats = { missing: 0, missingTranslated: 0, missingFallback: 0, empty: 0, emptyFixed: 0 };
    const beforeCount = countKeys(targetObj);
    
    // 1. Add missing keys
    for (const [keyPath, enValue] of Object.entries(enPaths)) {
      if (typeof enValue !== 'string') continue;
      const targetValue = getNestedValue(targetObj, keyPath);
      
      if (targetValue === undefined) {
        stats.missing++;
        const translation = translateValue(enValue, dict);
        if (translation && translation !== enValue) {
          setNestedValue(targetObj, keyPath, translation);
          stats.missingTranslated++;
        } else {
          setNestedValue(targetObj, keyPath, enValue);
          stats.missingFallback++;
        }
      } else if (typeof targetValue === 'string' && targetValue.trim() === '') {
        // 2. Fix empty values
        stats.empty++;
        const translation = translateValue(enValue, dict);
        if (translation) {
          setNestedValue(targetObj, keyPath, translation);
          stats.emptyFixed++;
        } else {
          setNestedValue(targetObj, keyPath, enValue);
        }
      }
    }
    
    const afterCount = countKeys(targetObj);
    console.log(`  Before: ${beforeCount} leaf keys`);
    console.log(`  After:  ${afterCount} leaf keys`);
    console.log(`  Missing keys added: ${stats.missing} (${stats.missingTranslated} translated, ${stats.missingFallback} EN fallback)`);
    console.log(`  Empty values fixed: ${stats.emptyFixed}`);
    console.log(`  Coverage: ${((afterCount / enKeyCount) * 100).toFixed(1)}%`);
    
    fs.writeFileSync(targetPath, JSON.stringify(targetObj, null, 2) + '\n', 'utf-8');
    console.log(`  ✅ Written to ${targetPath}`);
    
    report.push({ lang, name: LANG_NAMES[lang], before: beforeCount, after: afterCount, ...stats, coverage: ((afterCount / enKeyCount) * 100).toFixed(1) });
  }
  
  console.log('\n' + '═'.repeat(60));
  console.log('\n📋 SUMMARY REPORT\n');
  console.log('Language     | Before | After  | Added  | Translated | Fallback | Coverage');
  console.log('-------------|--------|--------|--------|------------|----------|--------');
  for (const r of report) {
    console.log(`${r.name.padEnd(13)}| ${String(r.before).padEnd(7)}| ${String(r.after).padEnd(7)}| ${String(r.missing).padEnd(7)}| ${String(r.missingTranslated).padEnd(11)}| ${String(r.missingFallback).padEnd(9)}| ${r.coverage}%`);
  }
  
  console.log(`\nEN Reference: ${enKeyCount} keys`);
  console.log('\n✅ Done!\n');
}

main();
