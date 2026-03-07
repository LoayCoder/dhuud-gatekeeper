#!/usr/bin/env node
/**
 * i18n Translation Script for Urdu, Hindi, and Filipino
 * 
 * Walks the English translation tree and adds missing keys to each target language
 * using built-in HSSE dictionaries. Does NOT overwrite existing translations.
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
  // Common UI
  'Save': 'محفوظ کریں', 'Cancel': 'منسوخ', 'Delete': 'حذف کریں', 'Edit': 'ترمیم کریں',
  'Submit': 'جمع کرائیں', 'Back': 'واپس', 'Next': 'اگلا', 'Previous': 'پچھلا',
  'Search': 'تلاش', 'Filter': 'فلٹر', 'View': 'دیکھیں', 'Details': 'تفصیلات',
  'All': 'سب', 'None': 'کوئی نہیں', 'Yes': 'ہاں', 'No': 'نہیں', 'OK': 'ٹھیک ہے',
  'Close': 'بند کریں', 'Open': 'کھولیں', 'Add': 'شامل کریں', 'Remove': 'ہٹائیں',
  'Create': 'بنائیں', 'Update': 'اپ ڈیٹ', 'Confirm': 'تصدیق کریں', 'Apply': 'لاگو کریں',
  'Reset': 'ری سیٹ', 'Clear': 'صاف کریں', 'Done': 'مکمل', 'Loading': 'لوڈ ہو رہا ہے',
  'Error': 'خرابی', 'Success': 'کامیابی', 'Warning': 'انتباہ', 'Info': 'معلومات',
  'Status': 'حیثیت', 'Actions': 'اقدامات', 'Settings': 'ترتیبات', 'Profile': 'پروفائل',
  'Dashboard': 'ڈیش بورڈ', 'Home': 'ہوم', 'Menu': 'مینو', 'Logout': 'لاگ آؤٹ',
  'Login': 'لاگ ان', 'Sign In': 'سائن ان', 'Sign Up': 'سائن اپ', 'Register': 'رجسٹر',
  'Email': 'ای میل', 'Password': 'پاس ورڈ', 'Username': 'صارف نام', 'Name': 'نام',
  'Title': 'عنوان', 'Description': 'تفصیل', 'Date': 'تاریخ', 'Time': 'وقت',
  'Location': 'مقام', 'Address': 'پتہ', 'Phone': 'فون', 'Notes': 'نوٹس',
  'Comments': 'تبصرے', 'Attachments': 'منسلکات', 'Files': 'فائلیں', 'Upload': 'اپ لوڈ',
  'Download': 'ڈاؤن لوڈ', 'Export': 'برآمد', 'Import': 'درآمد', 'Print': 'پرنٹ',
  'Select': 'منتخب کریں', 'Selected': 'منتخب', 'Total': 'کل', 'Count': 'شمار',
  'Active': 'فعال', 'Inactive': 'غیر فعال', 'Enabled': 'فعال', 'Disabled': 'غیر فعال',
  'Required': 'ضروری', 'Optional': 'اختیاری', 'Default': 'طے شدہ',
  'Start': 'شروع', 'End': 'ختم', 'From': 'سے', 'To': 'تک',
  'Type': 'قسم', 'Category': 'زمرہ', 'Priority': 'ترجیح', 'Severity': 'شدت',
  'Low': 'کم', 'Medium': 'درمیانہ', 'High': 'زیادہ', 'Critical': 'نازک',
  'Pending': 'زیر التواء', 'Approved': 'منظور', 'Rejected': 'مسترد', 'Completed': 'مکمل',
  'In Progress': 'جاری ہے', 'Draft': 'مسودہ', 'Closed': 'بند', 'Resolved': 'حل شدہ',
  'Overdue': 'مدت گزر چکی', 'Expired': 'ختم ہو گیا', 'Valid': 'درست', 'Invalid': 'غلط',
  'Assigned': 'تفویض', 'Unassigned': 'غیر تفویض', 'Escalated': 'بالا رجوع',
  'Department': 'محکمہ', 'Branch': 'شاخ', 'Site': 'سائٹ', 'Organization': 'تنظیم',
  'Company': 'کمپنی', 'Contractor': 'ٹھیکیدار', 'Worker': 'کارکن', 'Employee': 'ملازم',
  'Manager': 'مینیجر', 'Admin': 'ایڈمن', 'User': 'صارف', 'Visitor': 'مہمان',
  'Report': 'رپورٹ', 'Reports': 'رپورٹیں', 'Analytics': 'تجزیات', 'Statistics': 'اعداد و شمار',
  'Chart': 'چارٹ', 'Graph': 'گراف', 'Table': 'جدول', 'List': 'فہرست',
  'Summary': 'خلاصہ', 'Overview': 'جائزہ', 'History': 'تاریخچہ', 'Timeline': 'ٹائم لائن',
  'Notification': 'اطلاع', 'Notifications': 'اطلاعات', 'Alert': 'الرٹ', 'Alerts': 'الرٹس',
  'Message': 'پیغام', 'Messages': 'پیغامات', 'Reminder': 'یاد دہانی',
  'Role': 'کردار', 'Permission': 'اجازت', 'Permissions': 'اجازتیں', 'Access': 'رسائی',
  'Help': 'مدد', 'Support': 'معاونت', 'Documentation': 'دستاویزات',
  'Language': 'زبان', 'Theme': 'تھیم', 'Light': 'روشن', 'Dark': 'تاریک', 'System': 'سسٹم',
  'Refresh': 'تازہ کریں', 'Retry': 'دوبارہ کوشش', 'Copy': 'نقل',
  'Approve': 'منظور کریں', 'Reject': 'مسترد کریں', 'Review': 'جائزہ',
  'Assign': 'تفویض کریں', 'Transfer': 'منتقل کریں', 'Escalate': 'بالا بھیجیں',
  'Generate': 'تیار کریں', 'Generating': 'تیار ہو رہا ہے',
  'Days': 'دن', 'Hours': 'گھنٹے', 'Minutes': 'منٹ', 'Seconds': 'سیکنڈ',
  'Today': 'آج', 'Yesterday': 'کل', 'Tomorrow': 'کل', 'Week': 'ہفتہ', 'Month': 'مہینا', 'Year': 'سال',
  'January': 'جنوری', 'February': 'فروری', 'March': 'مارچ', 'April': 'اپریل',
  'May': 'مئی', 'June': 'جون', 'July': 'جولائی', 'August': 'اگست',
  'September': 'ستمبر', 'October': 'اکتوبر', 'November': 'نومبر', 'December': 'دسمبر',
  // HSSE-specific
  'Incident': 'واقعہ', 'Incidents': 'واقعات', 'Observation': 'مشاہدہ', 'Observations': 'مشاہدات',
  'Investigation': 'تحقیقات', 'Inspection': 'معائنہ', 'Inspections': 'معائنے',
  'Safety': 'حفاظت', 'Security': 'سیکیورٹی', 'Health': 'صحت', 'Environment': 'ماحولیات',
  'Risk': 'خطرہ', 'Risk Assessment': 'خطرے کی تشخیص', 'Hazard': 'خطرناک عنصر',
  'Near Miss': 'قریبی واقعہ', 'First Aid': 'ابتدائی طبی امداد',
  'Lost Time Injury': 'وقت ضائع ہونے والی چوٹ', 'Fatality': 'ہلاکت',
  'Corrective Action': 'اصلاحی اقدام', 'Corrective Actions': 'اصلاحی اقدامات',
  'Root Cause': 'بنیادی وجہ', 'Root Cause Analysis': 'بنیادی وجہ کا تجزیہ',
  'Permit': 'اجازت نامہ', 'Permits': 'اجازت نامے', 'Permit to Work': 'کام کا اجازت نامہ',
  'Gate Pass': 'گیٹ پاس', 'Gate Passes': 'گیٹ پاسز',
  'Asset': 'اثاثہ', 'Assets': 'اثاثے', 'Equipment': 'آلات', 'Maintenance': 'دیکھ بھال',
  'Calibration': 'کیلیبریشن', 'Warranty': 'وارنٹی', 'Depreciation': 'فرسودگی',
  'Patrol': 'گشت', 'Checkpoint': 'چیک پوائنٹ', 'Shift': 'شفٹ', 'Guard': 'محافظ',
  'Compliance': 'تعمیل', 'Audit': 'آڈٹ', 'Training': 'تربیت',
  'Emergency': 'ہنگامی', 'Evacuation': 'انخلاء', 'Fire': 'آگ', 'Chemical': 'کیمیائی',
  'PPE': 'ذاتی حفاظتی سازو سامان', 'SOP': 'معیاری آپریٹنگ طریقہ کار',
  'KPI': 'کارکردگی کے اہم اشارے', 'SLA': 'خدمات کی سطح کا معاہدہ',
  'Due Date': 'مقررہ تاریخ', 'Deadline': 'آخری تاریخ',
  'Evidence': 'ثبوت', 'Photo': 'تصویر', 'Photos': 'تصاویر', 'Document': 'دستاویز', 'Documents': 'دستاویزات',
  'Signature': 'دستخط', 'Witness': 'گواہ', 'Witnesses': 'گواہان',
  'Injury': 'چوٹ', 'Injuries': 'چوٹیں', 'Treatment': 'علاج',
  'Finding': 'نتیجہ', 'Findings': 'نتائج', 'Recommendation': 'سفارش',
  'Violation': 'خلاف ورزی', 'Violations': 'خلاف ورزیاں',
  'Project': 'پروجیکٹ', 'Projects': 'پروجیکٹس',
  'Schedule': 'شیڈول', 'Calendar': 'کیلنڈر',
  'Map': 'نقشہ', 'GPS': 'جی پی ایس', 'Coordinates': 'نقاط',
  'QR Code': 'کیو آر کوڈ', 'Barcode': 'بار کوڈ', 'Scan': 'سکین',
  'Approve': 'منظور کریں', 'Reject': 'مسترد کریں',
  'Reference': 'حوالہ', 'reference': 'حوالہ',
  'Version': 'ورژن', 'Updated': 'اپ ڈیٹ', 'Created': 'تخلیق',
  'Trend': 'رجحان', 'Performance': 'کارکردگی', 'Improvement': 'بہتری',
  'Submitted': 'جمع کرایا گیا', 'Under Review': 'جائزے میں',
  'Configuration': 'ترتیب', 'Preferences': 'ترجیحات',
  'Zone': 'زون', 'Area': 'علاقہ', 'Region': 'خطہ',
  'Supervisor': 'نگران', 'Inspector': 'معائنہ کار',
  'Acknowledged': 'تسلیم شدہ', 'Resolved': 'حل شدہ',
  'On Time': 'وقت پر', 'Late': 'تاخیر سے',
  'Manual': 'دستی', 'Automatic': 'خودکار',
  'Positive': 'مثبت', 'Negative': 'منفی', 'Neutral': 'غیر جانبدار',
  'Score': 'اسکور', 'Rating': 'درجہ بندی', 'Grade': 'گریڈ',
  'Bulk': 'بلک', 'Individual': 'انفرادی', 'Group': 'گروپ', 'Team': 'ٹیم',
  'Badge': 'بیج', 'Tag': 'ٹیگ', 'Label': 'لیبل',
  'Cost': 'لاگت', 'Price': 'قیمت', 'Amount': 'رقم', 'Currency': 'کرنسی',
  'Vendor': 'فروش', 'Supplier': 'سپلائر',
};

const HINDI_DICT = {
  // Common UI
  'Save': 'सहेजें', 'Cancel': 'रद्द करें', 'Delete': 'हटाएं', 'Edit': 'संपादित करें',
  'Submit': 'जमा करें', 'Back': 'वापस', 'Next': 'अगला', 'Previous': 'पिछला',
  'Search': 'खोजें', 'Filter': 'फ़िल्टर', 'View': 'देखें', 'Details': 'विवरण',
  'All': 'सभी', 'None': 'कोई नहीं', 'Yes': 'हां', 'No': 'नहीं', 'OK': 'ठीक है',
  'Close': 'बंद करें', 'Open': 'खोलें', 'Add': 'जोड़ें', 'Remove': 'हटाएं',
  'Create': 'बनाएं', 'Update': 'अपडेट', 'Confirm': 'पुष्टि करें', 'Apply': 'लागू करें',
  'Reset': 'रीसेट', 'Clear': 'साफ़ करें', 'Done': 'पूर्ण', 'Loading': 'लोड हो रहा है',
  'Error': 'त्रुटि', 'Success': 'सफलता', 'Warning': 'चेतावनी', 'Info': 'जानकारी',
  'Status': 'स्थिति', 'Actions': 'कार्रवाइयां', 'Settings': 'सेटिंग्स', 'Profile': 'प्रोफ़ाइल',
  'Dashboard': 'डैशबोर्ड', 'Home': 'होम', 'Menu': 'मेनू', 'Logout': 'लॉगआउट',
  'Login': 'लॉग इन', 'Sign In': 'साइन इन', 'Sign Up': 'साइन अप', 'Register': 'पंजीकरण',
  'Email': 'ईमेल', 'Password': 'पासवर्ड', 'Username': 'उपयोगकर्ता नाम', 'Name': 'नाम',
  'Title': 'शीर्षक', 'Description': 'विवरण', 'Date': 'तारीख', 'Time': 'समय',
  'Location': 'स्थान', 'Address': 'पता', 'Phone': 'फ़ोन', 'Notes': 'नोट्स',
  'Comments': 'टिप्पणियां', 'Attachments': 'अनुलग्नक', 'Files': 'फ़ाइलें', 'Upload': 'अपलोड',
  'Download': 'डाउनलोड', 'Export': 'निर्यात', 'Import': 'आयात', 'Print': 'प्रिंट',
  'Select': 'चुनें', 'Selected': 'चयनित', 'Total': 'कुल', 'Count': 'गिनती',
  'Active': 'सक्रिय', 'Inactive': 'निष्क्रिय', 'Enabled': 'सक्रिय', 'Disabled': 'निष्क्रिय',
  'Required': 'आवश्यक', 'Optional': 'वैकल्पिक', 'Default': 'डिफ़ॉल्ट',
  'Start': 'शुरू', 'End': 'समाप्त', 'From': 'से', 'To': 'तक',
  'Type': 'प्रकार', 'Category': 'श्रेणी', 'Priority': 'प्राथमिकता', 'Severity': 'गंभीरता',
  'Low': 'कम', 'Medium': 'मध्यम', 'High': 'उच्च', 'Critical': 'गंभीर',
  'Pending': 'लंबित', 'Approved': 'स्वीकृत', 'Rejected': 'अस्वीकृत', 'Completed': 'पूर्ण',
  'In Progress': 'प्रगति में', 'Draft': 'मसौदा', 'Closed': 'बंद', 'Resolved': 'हल किया',
  'Overdue': 'अतिदेय', 'Expired': 'समाप्त', 'Valid': 'मान्य', 'Invalid': 'अमान्य',
  'Assigned': 'आवंटित', 'Unassigned': 'अनावंटित', 'Escalated': 'बढ़ाया गया',
  'Department': 'विभाग', 'Branch': 'शाखा', 'Site': 'साइट', 'Organization': 'संगठन',
  'Company': 'कंपनी', 'Contractor': 'ठेकेदार', 'Worker': 'कर्मचारी', 'Employee': 'कर्मचारी',
  'Manager': 'प्रबंधक', 'Admin': 'व्यवस्थापक', 'User': 'उपयोगकर्ता', 'Visitor': 'आगंतुक',
  'Report': 'रिपोर्ट', 'Reports': 'रिपोर्टें', 'Analytics': 'विश्लेषण', 'Statistics': 'सांख्यिकी',
  'Chart': 'चार्ट', 'Graph': 'ग्राफ़', 'Table': 'तालिका', 'List': 'सूची',
  'Summary': 'सारांश', 'Overview': 'अवलोकन', 'History': 'इतिहास', 'Timeline': 'समयरेखा',
  'Notification': 'सूचना', 'Notifications': 'सूचनाएं', 'Alert': 'अलर्ट', 'Alerts': 'अलर्ट्स',
  'Message': 'संदेश', 'Messages': 'संदेश', 'Reminder': 'अनुस्मारक',
  'Role': 'भूमिका', 'Permission': 'अनुमति', 'Permissions': 'अनुमतियां', 'Access': 'पहुंच',
  'Help': 'सहायता', 'Support': 'समर्थन', 'Documentation': 'दस्तावेज़ीकरण',
  'Language': 'भाषा', 'Theme': 'थीम', 'Light': 'लाइट', 'Dark': 'डार्क', 'System': 'सिस्टम',
  'Refresh': 'ताज़ा करें', 'Retry': 'पुनः प्रयास', 'Copy': 'प्रतिलिपि',
  'Approve': 'स्वीकृत करें', 'Reject': 'अस्वीकार करें', 'Review': 'समीक्षा',
  'Assign': 'आवंटित करें', 'Transfer': 'स्थानांतरित करें', 'Escalate': 'बढ़ाएं',
  'Generate': 'उत्पन्न करें', 'Generating': 'उत्पन्न हो रहा है',
  'Days': 'दिन', 'Hours': 'घंटे', 'Minutes': 'मिनट', 'Seconds': 'सेकंड',
  'Today': 'आज', 'Yesterday': 'कल', 'Tomorrow': 'कल', 'Week': 'सप्ताह', 'Month': 'महीना', 'Year': 'वर्ष',
  'January': 'जनवरी', 'February': 'फ़रवरी', 'March': 'मार्च', 'April': 'अप्रैल',
  'May': 'मई', 'June': 'जून', 'July': 'जुलाई', 'August': 'अगस्त',
  'September': 'सितंबर', 'October': 'अक्टूबर', 'November': 'नवंबर', 'December': 'दिसंबर',
  // HSSE-specific
  'Incident': 'घटना', 'Incidents': 'घटनाएं', 'Observation': 'अवलोकन', 'Observations': 'अवलोकन',
  'Investigation': 'जांच', 'Inspection': 'निरीक्षण', 'Inspections': 'निरीक्षण',
  'Safety': 'सुरक्षा', 'Security': 'सुरक्षा', 'Health': 'स्वास्थ्य', 'Environment': 'पर्यावरण',
  'Risk': 'जोखिम', 'Risk Assessment': 'जोखिम मूल्यांकन', 'Hazard': 'खतरा',
  'Near Miss': 'निकट चूक', 'First Aid': 'प्राथमिक चिकित्सा',
  'Lost Time Injury': 'समय हानि चोट', 'Fatality': 'मृत्यु',
  'Corrective Action': 'सुधारात्मक कार्रवाई', 'Corrective Actions': 'सुधारात्मक कार्रवाइयां',
  'Root Cause': 'मूल कारण', 'Root Cause Analysis': 'मूल कारण विश्लेषण',
  'Permit': 'अनुमति', 'Permits': 'अनुमतियां', 'Permit to Work': 'कार्य अनुमति',
  'Gate Pass': 'गेट पास', 'Gate Passes': 'गेट पास',
  'Asset': 'संपत्ति', 'Assets': 'संपत्तियां', 'Equipment': 'उपकरण', 'Maintenance': 'रखरखाव',
  'Calibration': 'कैलिब्रेशन', 'Warranty': 'वारंटी', 'Depreciation': 'मूल्यह्रास',
  'Patrol': 'गश्त', 'Checkpoint': 'चेकपॉइंट', 'Shift': 'शिफ्ट', 'Guard': 'गार्ड',
  'Compliance': 'अनुपालन', 'Audit': 'ऑडिट', 'Training': 'प्रशिक्षण',
  'Emergency': 'आपातकालीन', 'Evacuation': 'निकासी', 'Fire': 'अग्नि', 'Chemical': 'रासायनिक',
  'PPE': 'व्यक्तिगत सुरक्षा उपकरण', 'SOP': 'मानक संचालन प्रक्रिया',
  'KPI': 'प्रमुख प्रदर्शन संकेतक', 'SLA': 'सेवा स्तर समझौता',
  'Due Date': 'नियत तारीख', 'Deadline': 'अंतिम तारीख',
  'Evidence': 'साक्ष्य', 'Photo': 'फ़ोटो', 'Photos': 'फ़ोटो', 'Document': 'दस्तावेज़', 'Documents': 'दस्तावेज़',
  'Signature': 'हस्ताक्षर', 'Witness': 'गवाह', 'Witnesses': 'गवाह',
  'Injury': 'चोट', 'Injuries': 'चोटें', 'Treatment': 'उपचार',
  'Finding': 'निष्कर्ष', 'Findings': 'निष्कर्ष', 'Recommendation': 'सिफ़ारिश',
  'Violation': 'उल्लंघन', 'Violations': 'उल्लंघन',
  'Project': 'परियोजना', 'Projects': 'परियोजनाएं',
  'Schedule': 'अनुसूची', 'Calendar': 'कैलेंडर',
  'Map': 'मानचित्र', 'GPS': 'जीपीएस', 'Coordinates': 'निर्देशांक',
  'QR Code': 'क्यूआर कोड', 'Barcode': 'बारकोड', 'Scan': 'स्कैन',
  'Reference': 'संदर्भ', 'reference': 'संदर्भ',
  'Version': 'संस्करण', 'Updated': 'अपडेट', 'Created': 'निर्मित',
  'Trend': 'रुझान', 'Performance': 'प्रदर्शन', 'Improvement': 'सुधार',
  'Submitted': 'जमा किया गया', 'Under Review': 'समीक्षा में',
  'Configuration': 'कॉन्फ़िगरेशन', 'Preferences': 'प्राथमिकताएं',
  'Zone': 'ज़ोन', 'Area': 'क्षेत्र', 'Region': 'क्षेत्र',
  'Supervisor': 'पर्यवेक्षक', 'Inspector': 'निरीक्षक',
  'Acknowledged': 'स्वीकार किया', 'On Time': 'समय पर', 'Late': 'विलंबित',
  'Manual': 'मैनुअल', 'Automatic': 'स्वचालित',
  'Positive': 'सकारात्मक', 'Negative': 'नकारात्मक', 'Neutral': 'तटस्थ',
  'Score': 'स्कोर', 'Rating': 'रेटिंग', 'Grade': 'ग्रेड',
  'Bulk': 'बल्क', 'Individual': 'व्यक्तिगत', 'Group': 'समूह', 'Team': 'टीम',
  'Badge': 'बैज', 'Tag': 'टैग', 'Label': 'लेबल',
  'Cost': 'लागत', 'Price': 'मूल्य', 'Amount': 'राशि', 'Currency': 'मुद्रा',
  'Vendor': 'विक्रेता', 'Supplier': 'आपूर्तिकर्ता',
};

const FILIPINO_DICT = {
  // Common UI
  'Save': 'I-save', 'Cancel': 'Kanselahin', 'Delete': 'Burahin', 'Edit': 'I-edit',
  'Submit': 'Isumite', 'Back': 'Bumalik', 'Next': 'Susunod', 'Previous': 'Nakaraan',
  'Search': 'Maghanap', 'Filter': 'Salain', 'View': 'Tingnan', 'Details': 'Detalye',
  'All': 'Lahat', 'None': 'Wala', 'Yes': 'Oo', 'No': 'Hindi', 'OK': 'OK',
  'Close': 'Isara', 'Open': 'Buksan', 'Add': 'Idagdag', 'Remove': 'Alisin',
  'Create': 'Lumikha', 'Update': 'I-update', 'Confirm': 'Kumpirmahin', 'Apply': 'Ilapat',
  'Reset': 'I-reset', 'Clear': 'Linisin', 'Done': 'Tapos na', 'Loading': 'Naglo-load',
  'Error': 'Error', 'Success': 'Tagumpay', 'Warning': 'Babala', 'Info': 'Impormasyon',
  'Status': 'Katayuan', 'Actions': 'Mga Aksyon', 'Settings': 'Mga Setting', 'Profile': 'Profile',
  'Dashboard': 'Dashboard', 'Home': 'Home', 'Menu': 'Menu', 'Logout': 'Mag-logout',
  'Login': 'Mag-login', 'Sign In': 'Mag-sign in', 'Sign Up': 'Mag-sign up', 'Register': 'Magrehistro',
  'Email': 'Email', 'Password': 'Password', 'Username': 'Username', 'Name': 'Pangalan',
  'Title': 'Pamagat', 'Description': 'Paglalarawan', 'Date': 'Petsa', 'Time': 'Oras',
  'Location': 'Lokasyon', 'Address': 'Address', 'Phone': 'Telepono', 'Notes': 'Mga Tala',
  'Comments': 'Mga Komento', 'Attachments': 'Mga Kalakip', 'Files': 'Mga File', 'Upload': 'I-upload',
  'Download': 'I-download', 'Export': 'I-export', 'Import': 'I-import', 'Print': 'I-print',
  'Select': 'Pumili', 'Selected': 'Napili', 'Total': 'Kabuuan', 'Count': 'Bilang',
  'Active': 'Aktibo', 'Inactive': 'Hindi aktibo', 'Enabled': 'Naka-enable', 'Disabled': 'Naka-disable',
  'Required': 'Kinakailangan', 'Optional': 'Opsyonal', 'Default': 'Default',
  'Start': 'Simula', 'End': 'Wakas', 'From': 'Mula', 'To': 'Hanggang',
  'Type': 'Uri', 'Category': 'Kategorya', 'Priority': 'Priyoridad', 'Severity': 'Kalubhaan',
  'Low': 'Mababa', 'Medium': 'Katamtaman', 'High': 'Mataas', 'Critical': 'Kritikal',
  'Pending': 'Nakabinbin', 'Approved': 'Naaprubahan', 'Rejected': 'Tinanggihan', 'Completed': 'Nakumpleto',
  'In Progress': 'Isinasagawa', 'Draft': 'Draft', 'Closed': 'Sarado', 'Resolved': 'Nalutas',
  'Overdue': 'Lagpas na', 'Expired': 'Nag-expire na', 'Valid': 'Balido', 'Invalid': 'Hindi balido',
  'Assigned': 'Nakatalaga', 'Unassigned': 'Hindi nakatalaga', 'Escalated': 'Na-escalate',
  'Department': 'Departamento', 'Branch': 'Sangay', 'Site': 'Site', 'Organization': 'Organisasyon',
  'Company': 'Kumpanya', 'Contractor': 'Kontratista', 'Worker': 'Manggagawa', 'Employee': 'Empleyado',
  'Manager': 'Manager', 'Admin': 'Admin', 'User': 'Gumagamit', 'Visitor': 'Bisita',
  'Report': 'Ulat', 'Reports': 'Mga Ulat', 'Analytics': 'Analytics', 'Statistics': 'Istatistika',
  'Chart': 'Tsart', 'Graph': 'Graph', 'Table': 'Talahanayan', 'List': 'Listahan',
  'Summary': 'Buod', 'Overview': 'Pangkalahatang-tanaw', 'History': 'Kasaysayan', 'Timeline': 'Timeline',
  'Notification': 'Abiso', 'Notifications': 'Mga Abiso', 'Alert': 'Alerto', 'Alerts': 'Mga Alerto',
  'Message': 'Mensahe', 'Messages': 'Mga Mensahe', 'Reminder': 'Paalala',
  'Role': 'Tungkulin', 'Permission': 'Pahintulot', 'Permissions': 'Mga Pahintulot', 'Access': 'Access',
  'Help': 'Tulong', 'Support': 'Suporta', 'Documentation': 'Dokumentasyon',
  'Language': 'Wika', 'Theme': 'Tema', 'Light': 'Light', 'Dark': 'Dark', 'System': 'System',
  'Refresh': 'I-refresh', 'Retry': 'Subukan muli', 'Copy': 'Kopyahin',
  'Approve': 'Aprubahan', 'Reject': 'Tanggihan', 'Review': 'Suriin',
  'Assign': 'Italaga', 'Transfer': 'Ilipat', 'Escalate': 'I-escalate',
  'Generate': 'Bumuo', 'Generating': 'Bumubuo',
  'Days': 'Mga Araw', 'Hours': 'Mga Oras', 'Minutes': 'Mga Minuto', 'Seconds': 'Mga Segundo',
  'Today': 'Ngayon', 'Yesterday': 'Kahapon', 'Tomorrow': 'Bukas', 'Week': 'Linggo', 'Month': 'Buwan', 'Year': 'Taon',
  'January': 'Enero', 'February': 'Pebrero', 'March': 'Marso', 'April': 'Abril',
  'May': 'Mayo', 'June': 'Hunyo', 'July': 'Hulyo', 'August': 'Agosto',
  'September': 'Setyembre', 'October': 'Oktubre', 'November': 'Nobyembre', 'December': 'Disyembre',
  // HSSE-specific
  'Incident': 'Insidente', 'Incidents': 'Mga Insidente', 'Observation': 'Obserbasyon', 'Observations': 'Mga Obserbasyon',
  'Investigation': 'Imbestigasyon', 'Inspection': 'Inspeksyon', 'Inspections': 'Mga Inspeksyon',
  'Safety': 'Kaligtasan', 'Security': 'Seguridad', 'Health': 'Kalusugan', 'Environment': 'Kapaligiran',
  'Risk': 'Panganib', 'Risk Assessment': 'Pagsusuri ng Panganib', 'Hazard': 'Panganib',
  'Near Miss': 'Halos Aksidente', 'First Aid': 'Paunang Lunas',
  'Lost Time Injury': 'Pinsalang May Nawang Oras', 'Fatality': 'Pagkamatay',
  'Corrective Action': 'Pagwawastong Aksyon', 'Corrective Actions': 'Mga Pagwawastong Aksyon',
  'Root Cause': 'Ugat ng Sanhi', 'Root Cause Analysis': 'Pagsusuri ng Ugat ng Sanhi',
  'Permit': 'Permiso', 'Permits': 'Mga Permiso', 'Permit to Work': 'Permiso sa Trabaho',
  'Gate Pass': 'Gate Pass', 'Gate Passes': 'Mga Gate Pass',
  'Asset': 'Asset', 'Assets': 'Mga Asset', 'Equipment': 'Kagamitan', 'Maintenance': 'Pagpapanatili',
  'Calibration': 'Kalibrahin', 'Warranty': 'Warranty', 'Depreciation': 'Pagbaba ng Halaga',
  'Patrol': 'Patrol', 'Checkpoint': 'Checkpoint', 'Shift': 'Shift', 'Guard': 'Guwardiya',
  'Compliance': 'Pagsunod', 'Audit': 'Audit', 'Training': 'Pagsasanay',
  'Emergency': 'Emerhensya', 'Evacuation': 'Ebakwasyon', 'Fire': 'Sunog', 'Chemical': 'Kemikal',
  'PPE': 'Personal na Kagamitang Pangkaligtasan', 'SOP': 'Karaniwang Pamamaraan ng Operasyon',
  'KPI': 'Pangunahing Tagapagpahiwatig ng Pagganap', 'SLA': 'Kasunduan sa Antas ng Serbisyo',
  'Due Date': 'Takdang Petsa', 'Deadline': 'Huling Araw',
  'Evidence': 'Ebidensya', 'Photo': 'Larawan', 'Photos': 'Mga Larawan', 'Document': 'Dokumento', 'Documents': 'Mga Dokumento',
  'Signature': 'Lagda', 'Witness': 'Saksi', 'Witnesses': 'Mga Saksi',
  'Injury': 'Pinsala', 'Injuries': 'Mga Pinsala', 'Treatment': 'Paggamot',
  'Finding': 'Natuklasan', 'Findings': 'Mga Natuklasan', 'Recommendation': 'Rekomendasyon',
  'Violation': 'Paglabag', 'Violations': 'Mga Paglabag',
  'Project': 'Proyekto', 'Projects': 'Mga Proyekto',
  'Schedule': 'Iskedyul', 'Calendar': 'Kalendaryo',
  'Map': 'Mapa', 'GPS': 'GPS', 'Coordinates': 'Mga Coordinate',
  'QR Code': 'QR Code', 'Barcode': 'Barcode', 'Scan': 'I-scan',
  'Reference': 'Sanggunian', 'reference': 'sanggunian',
  'Version': 'Bersyon', 'Updated': 'Na-update', 'Created': 'Nilikha',
  'Trend': 'Kalakaran', 'Performance': 'Pagganap', 'Improvement': 'Pagpapabuti',
  'Submitted': 'Isinumite', 'Under Review': 'Sinusuri',
  'Configuration': 'Kumpigurasyon', 'Preferences': 'Mga Kagustuhan',
  'Zone': 'Zona', 'Area': 'Lugar', 'Region': 'Rehiyon',
  'Supervisor': 'Superbisor', 'Inspector': 'Inspektor',
  'Acknowledged': 'Kinilala', 'On Time': 'Sa oras', 'Late': 'Huli',
  'Manual': 'Manu-mano', 'Automatic': 'Awtomatiko',
  'Positive': 'Positibo', 'Negative': 'Negatibo', 'Neutral': 'Neutral',
  'Score': 'Iskor', 'Rating': 'Rating', 'Grade': 'Grado',
  'Bulk': 'Maramihan', 'Individual': 'Indibidwal', 'Group': 'Grupo', 'Team': 'Koponan',
  'Badge': 'Badge', 'Tag': 'Tag', 'Label': 'Label',
  'Cost': 'Gastos', 'Price': 'Presyo', 'Amount': 'Halaga', 'Currency': 'Pera',
  'Vendor': 'Vendor', 'Supplier': 'Supplier',
};

const DICTIONARIES = { ur: URDU_DICT, hi: HINDI_DICT, fil: FILIPINO_DICT };
const LANG_NAMES = { ur: 'Urdu', hi: 'Hindi', fil: 'Filipino' };

// ─── Core Logic ────────────────────────────────────────────────────────────

function translateValue(enValue, dict) {
  if (typeof enValue !== 'string') return null;
  
  // Exact match
  if (dict[enValue]) return dict[enValue];
  
  // Try case-insensitive exact match
  const lowerMap = {};
  for (const [k, v] of Object.entries(dict)) lowerMap[k.toLowerCase()] = v;
  if (lowerMap[enValue.toLowerCase()]) return lowerMap[enValue.toLowerCase()];
  
  // Extract placeholders & HTML, translate words, reassemble
  const placeholders = [];
  let cleaned = enValue.replace(/\{\{[^}]+\}\}/g, (m) => { placeholders.push(m); return `__PH${placeholders.length - 1}__`; });
  const htmlTags = [];
  cleaned = cleaned.replace(/<[^>]+>/g, (m) => { htmlTags.push(m); return `__HTML${htmlTags.length - 1}__`; });
  
  // Word-by-word translation for short strings (< 8 words)
  const words = cleaned.split(/\s+/);
  if (words.length <= 7) {
    let translated = false;
    const result = words.map(w => {
      // Strip punctuation for lookup
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
  
  return null; // Cannot translate — will copy EN as fallback
}

function addMissingKeys(enObj, targetObj, dict, path = '', stats = { added: 0, translated: 0, fallback: 0 }) {
  for (const [key, enValue] of Object.entries(enObj)) {
    const fullPath = path ? `${path}.${key}` : key;
    
    if (enValue && typeof enValue === 'object' && !Array.isArray(enValue)) {
      if (!targetObj[key] || typeof targetObj[key] !== 'object') {
        targetObj[key] = {};
      }
      addMissingKeys(enValue, targetObj[key], dict, fullPath, stats);
    } else if (!(key in targetObj)) {
      // Missing key — try to translate
      const translation = translateValue(enValue, dict);
      if (translation && translation !== enValue) {
        targetObj[key] = translation;
        stats.translated++;
      } else {
        targetObj[key] = enValue; // Fallback to English
        stats.fallback++;
      }
      stats.added++;
    }
  }
  return stats;
}

function countKeys(obj, count = 0) {
  for (const v of Object.values(obj)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      count = countKeys(v, count);
    } else {
      count++;
    }
  }
  return count;
}

// ─── Main ──────────────────────────────────────────────────────────────────

function main() {
  const LOCALES_DIR = path.join(__dirname, '..', 'src', 'locales');
  
  // Parse EN with dedup
  const enRaw = fs.readFileSync(path.join(LOCALES_DIR, 'en', 'translation.json'), 'utf-8');
  const enObj = parseJsonDedup(enRaw);
  const enKeyCount = countKeys(enObj);
  
  console.log(`\n📊 English source: ${enKeyCount} leaf keys\n`);
  console.log('═'.repeat(60));
  
  const report = [];
  
  for (const lang of ['ur', 'hi', 'fil']) {
    console.log(`\n🌐 Processing ${LANG_NAMES[lang]} (${lang})...`);
    
    const targetPath = path.join(LOCALES_DIR, lang, 'translation.json');
    const targetRaw = fs.readFileSync(targetPath, 'utf-8');
    let targetObj;
    
    try {
      targetObj = parseJsonDedup(targetRaw);
    } catch {
      targetObj = JSON.parse(targetRaw);
    }
    
    const beforeCount = countKeys(targetObj);
    console.log(`  Before: ${beforeCount} leaf keys`);
    
    const stats = addMissingKeys(enObj, targetObj, DICTIONARIES[lang]);
    
    const afterCount = countKeys(targetObj);
    console.log(`  After:  ${afterCount} leaf keys`);
    console.log(`  Added:  ${stats.added} keys (${stats.translated} translated, ${stats.fallback} EN fallback)`);
    console.log(`  Coverage: ${((afterCount / enKeyCount) * 100).toFixed(1)}%`);
    
    // Write back
    fs.writeFileSync(targetPath, JSON.stringify(targetObj, null, 2) + '\n', 'utf-8');
    console.log(`  ✅ Written to ${targetPath}`);
    
    report.push({ lang, name: LANG_NAMES[lang], before: beforeCount, after: afterCount, ...stats, coverage: ((afterCount / enKeyCount) * 100).toFixed(1) });
  }
  
  // Summary report
  console.log('\n' + '═'.repeat(60));
  console.log('\n📋 SUMMARY REPORT\n');
  console.log('Language     | Before | After  | Added  | Translated | Fallback | Coverage');
  console.log('-------------|--------|--------|--------|------------|----------|--------');
  for (const r of report) {
    console.log(`${r.name.padEnd(13)}| ${String(r.before).padEnd(7)}| ${String(r.after).padEnd(7)}| ${String(r.added).padEnd(7)}| ${String(r.translated).padEnd(11)}| ${String(r.fallback).padEnd(9)}| ${r.coverage}%`);
  }
  
  console.log(`\nEN Reference: ${enKeyCount} keys`);
  console.log('\n✅ Done! Run `node scripts/i18n-translate-remaining.cjs` again to verify 0 missing keys.');
}

main();
