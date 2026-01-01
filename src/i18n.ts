import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translations (bundled for Zero Trust compliance) - v2
import en from './locales/en/translation.json';
import ar from './locales/ar/translation.json';
import ur from './locales/ur/translation.json';
import hi from './locales/hi/translation.json';
import fil from './locales/fil/translation.json';

export const defaultNS = 'translation';

export const resources = {
  en: { translation: en },
  ar: { translation: ar },
  ur: { translation: ur },
  hi: { translation: hi },
  fil: { translation: fil },
} as const;

// RTL Languages
const RTL_LANGUAGES = ['ar', 'ur'];

// Font family mapping for each language
const LANGUAGE_FONTS: Record<string, string> = {
  en: "'Rubik', sans-serif",
  ar: "'Rubik', sans-serif",
  ur: "'Noto Nastaliq Urdu', 'Rubik', sans-serif",
  hi: "'Noto Sans Devanagari', 'Rubik', sans-serif",
  fil: "'Rubik', sans-serif",
};

// Extract readable text from translation key
// e.g., "common.retry" → "Retry", "incidents.submit_form" → "Submit Form"
const extractReadableText = (key: string): string => {
  const lastPart = key.split('.').pop() || key;
  // Convert snake_case or camelCase to Title Case with spaces
  return lastPart
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

i18n
  .use(LanguageDetector)
  .init({
    resources,
    defaultNS,
    fallbackLng: 'en',
    debug: import.meta.env.DEV,

    interpolation: {
      escapeValue: false, // React already escapes
    },

    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },

    // Fallback mechanism for missing keys
    saveMissing: true,
    returnEmptyString: false,
    
    // Transform missing keys into readable text for users
    parseMissingKeyHandler: (key: string) => {
      return extractReadableText(key);
    },

    // Log missing keys in development for debugging
    missingKeyHandler: (_lngs, _ns, key) => {
      if (import.meta.env.DEV) {
        console.warn(`[i18n] Missing translation key: "${key}"`);
      }
    },
  });

// Dynamic RTL/LTR and font switching
i18n.on('languageChanged', (lng) => {
  const dir = RTL_LANGUAGES.includes(lng) ? 'rtl' : 'ltr';
  document.documentElement.dir = dir;
  document.documentElement.lang = lng;
  
  // Apply language-specific font
  const fontFamily = LANGUAGE_FONTS[lng] || LANGUAGE_FONTS.en;
  document.documentElement.style.setProperty('--font-rubik', fontFamily);
});

// Initialize direction on load
const initLang = i18n.language || 'en';
document.documentElement.dir = RTL_LANGUAGES.includes(initLang) ? 'rtl' : 'ltr';
document.documentElement.lang = initLang;

export default i18n;
