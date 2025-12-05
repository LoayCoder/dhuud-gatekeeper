// Multi-currency support for GCC countries, USD, and CNY
// CRITICAL: Currency data comes from database - these are fallback defaults only

export interface CurrencyConfig {
  code: string;
  name: string;
  nameAr: string;
  symbol: string;
  symbolAr: string;
  decimals: number;
  locale: string;
  localeAr: string;
}

// Fallback currency configurations (database is source of truth)
export const SUPPORTED_CURRENCIES: Record<string, CurrencyConfig> = {
  SAR: { code: 'SAR', name: 'Saudi Riyal', nameAr: 'ريال سعودي', symbol: 'SAR', symbolAr: 'ر.س', decimals: 2, locale: 'en-SA', localeAr: 'ar-SA' },
  AED: { code: 'AED', name: 'UAE Dirham', nameAr: 'درهم إماراتي', symbol: 'AED', symbolAr: 'د.إ', decimals: 2, locale: 'en-AE', localeAr: 'ar-AE' },
  BHD: { code: 'BHD', name: 'Bahraini Dinar', nameAr: 'دينار بحريني', symbol: 'BHD', symbolAr: 'د.ب', decimals: 3, locale: 'en-BH', localeAr: 'ar-BH' },
  KWD: { code: 'KWD', name: 'Kuwaiti Dinar', nameAr: 'دينار كويتي', symbol: 'KWD', symbolAr: 'د.ك', decimals: 3, locale: 'en-KW', localeAr: 'ar-KW' },
  OMR: { code: 'OMR', name: 'Omani Rial', nameAr: 'ريال عماني', symbol: 'OMR', symbolAr: 'ر.ع', decimals: 3, locale: 'en-OM', localeAr: 'ar-OM' },
  QAR: { code: 'QAR', name: 'Qatari Riyal', nameAr: 'ريال قطري', symbol: 'QAR', symbolAr: 'ر.ق', decimals: 2, locale: 'en-QA', localeAr: 'ar-QA' },
  USD: { code: 'USD', name: 'US Dollar', nameAr: 'دولار أمريكي', symbol: '$', symbolAr: '$', decimals: 2, locale: 'en-US', localeAr: 'ar-US' },
  CNY: { code: 'CNY', name: 'Chinese Yuan', nameAr: 'يوان صيني', symbol: '¥', symbolAr: '¥', decimals: 2, locale: 'zh-CN', localeAr: 'ar-CN' },
};

/**
 * Get the number of decimal places for a currency
 */
export function getCurrencyDecimals(currencyCode: string): number {
  return SUPPORTED_CURRENCIES[currencyCode]?.decimals ?? 2;
}

/**
 * Format currency with proper locale and decimal handling
 * @param amount - Amount in base units (e.g., cents/halalas)
 * @param currencyCode - Currency code (SAR, AED, USD, etc.)
 * @param options - Formatting options
 */
export function formatCurrency(
  amount: number,
  currencyCode: string = 'SAR',
  options: {
    locale?: string;
    showSymbol?: boolean;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  } = {}
): string {
  const config = SUPPORTED_CURRENCIES[currencyCode] || SUPPORTED_CURRENCIES.SAR;
  const isArabic = document.documentElement.lang === 'ar' || document.documentElement.dir === 'rtl';
  const effectiveLocale = options.locale || (isArabic ? config.localeAr : config.locale);
  
  // Convert from base units (cents/halalas) to main currency units
  const divisor = Math.pow(10, config.decimals);
  const normalizedAmount = amount / (config.decimals === 3 ? 1000 : 100);
  
  const formatter = new Intl.NumberFormat(effectiveLocale, {
    style: options.showSymbol === false ? 'decimal' : 'currency',
    currency: currencyCode,
    minimumFractionDigits: options.minimumFractionDigits ?? 0,
    maximumFractionDigits: options.maximumFractionDigits ?? config.decimals,
  });

  return formatter.format(normalizedAmount);
}

/**
 * Format currency for Arabic display
 * @deprecated Use formatCurrency with appropriate locale instead
 */
export function formatCurrencyArabic(amount: number, currencyCode: string = 'SAR'): string {
  return formatCurrency(amount, currencyCode, { locale: SUPPORTED_CURRENCIES[currencyCode]?.localeAr });
}

/**
 * Get currency display name based on current language
 */
export function getCurrencyName(currencyCode: string, language: string = 'en'): string {
  const config = SUPPORTED_CURRENCIES[currencyCode];
  if (!config) return currencyCode;
  return language === 'ar' ? config.nameAr : config.name;
}

/**
 * Get currency symbol based on current language
 */
export function getCurrencySymbol(currencyCode: string, language: string = 'en'): string {
  const config = SUPPORTED_CURRENCIES[currencyCode];
  if (!config) return currencyCode;
  return language === 'ar' ? config.symbolAr : config.symbol;
}

/**
 * Get all supported currency codes
 */
export function getSupportedCurrencyCodes(): string[] {
  return Object.keys(SUPPORTED_CURRENCIES);
}
