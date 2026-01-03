/**
 * Language Resolution Utilities
 * Maps nationalities to appropriate languages for visitors and workers
 */

export type SupportedLanguage = 'ar' | 'en' | 'ur' | 'hi' | 'fil' | 'zh';
export type VisitorLanguage = 'ar' | 'en';
export type WorkerLanguage = SupportedLanguage;

// Arab countries that get Arabic for both visitors and workers
const ARAB_COUNTRY_CODES = new Set([
  'SA', 'AE', 'KW', 'QA', 'BH', 'OM', 'JO', 'LB', 'SY', 'IQ',
  'EG', 'SD', 'LY', 'TN', 'DZ', 'MA', 'YE', 'PS', 'MR', 'SO'
]);

// Specific worker language mappings by nationality
const WORKER_LANGUAGE_MAP: Record<string, WorkerLanguage> = {
  'PK': 'ur',  // Pakistan -> Urdu
  'IN': 'hi',  // India -> Hindi
  'PH': 'fil', // Philippines -> Filipino
  'CN': 'zh',  // China -> Chinese
};

/**
 * Resolve visitor language based on nationality
 * - Arab countries -> Arabic
 * - All others -> English
 */
export function resolveVisitorLanguage(nationalityCode: string | null | undefined): VisitorLanguage {
  if (!nationalityCode) return 'en';
  const code = nationalityCode.toUpperCase();
  return ARAB_COUNTRY_CODES.has(code) ? 'ar' : 'en';
}

/**
 * Resolve worker language based on nationality
 * - Arab countries -> Arabic
 * - Pakistan -> Urdu
 * - India -> Hindi
 * - Philippines -> Filipino
 * - China -> Chinese
 * - All others -> English
 */
export function resolveWorkerLanguage(nationalityCode: string | null | undefined): WorkerLanguage {
  if (!nationalityCode) return 'en';
  const code = nationalityCode.toUpperCase();
  
  // Check Arab countries first
  if (ARAB_COUNTRY_CODES.has(code)) {
    return 'ar';
  }
  
  // Check specific worker language mappings
  if (code in WORKER_LANGUAGE_MAP) {
    return WORKER_LANGUAGE_MAP[code];
  }
  
  // Default to English
  return 'en';
}

/**
 * Get display name for a language code
 */
export function getLanguageDisplayName(lang: SupportedLanguage, inArabic = false): string {
  const names: Record<SupportedLanguage, { en: string; ar: string }> = {
    ar: { en: 'Arabic', ar: 'العربية' },
    en: { en: 'English', ar: 'الإنجليزية' },
    ur: { en: 'Urdu', ar: 'الأردية' },
    hi: { en: 'Hindi', ar: 'الهندية' },
    fil: { en: 'Filipino', ar: 'الفلبينية' },
    zh: { en: 'Chinese', ar: 'الصينية' },
  };
  return inArabic ? names[lang].ar : names[lang].en;
}

/**
 * Get supported languages for a page type
 */
export function getSupportedLanguagesForPageType(
  pageType: 'visitor_badge' | 'worker_pass' | 'worker_induction'
): SupportedLanguage[] {
  if (pageType === 'visitor_badge') {
    return ['ar', 'en'];
  }
  return ['ar', 'en', 'ur', 'hi', 'fil', 'zh'];
}

/**
 * Check if a language is RTL
 */
export function isRTL(lang: SupportedLanguage): boolean {
  return lang === 'ar' || lang === 'ur';
}

/**
 * Get the text direction for a language
 */
export function getTextDirection(lang: SupportedLanguage): 'rtl' | 'ltr' {
  return isRTL(lang) ? 'rtl' : 'ltr';
}
