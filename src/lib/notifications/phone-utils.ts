/**
 * PHONE NUMBER NORMALIZATION (E.164)
 *
 * Single source of truth for phone number validation and normalization.
 * All modules MUST use this utility before storing or sending to any channel.
 *
 * E.164 Format: +<countryCode><number> (e.g., +966501234567)
 * - Max 15 digits total (including country code)
 * - Always starts with +
 * - No spaces, dashes, or parentheses
 */

/**
 * Well-known country dial codes and the expected local number length (without leading 0).
 * Used to decide whether a bare digit string is likely a local number for a given country.
 */
const COUNTRY_LOCAL_LENGTHS: Record<string, number[]> = {
  '966': [9],       // Saudi Arabia: 5XXXXXXXX
  '971': [9],       // UAE
  '974': [8],       // Qatar
  '973': [8],       // Bahrain
  '968': [8],       // Oman
  '965': [8],       // Kuwait
  '44': [10],      // UK
  '1': [10],      // US/Canada
  '91': [10],      // India
  '92': [10],      // Pakistan
  '63': [10],      // Philippines
  '20': [10],      // Egypt
  '962': [9],       // Jordan
};

export interface PhoneNormalizationOptions {
  /**
   * Default country dial code (digits only, no +) to use when a local number
   * cannot be resolved to a country. Example: '966' for Saudi Arabia.
   *
   * If not provided, local-only numbers (starting with 0 or matching a known
   * local length) will be rejected rather than guessed.
   */
  defaultCountryCode?: string;
}

/**
 * Normalizes a phone number to E.164 format.
 * Returns null if the number cannot be normalized.
 *
 * Rules:
 * - Strips whitespace, dashes, parentheses
 * - Converts 00-prefix to +
 * - Uses `defaultCountryCode` (from tenant settings) for local numbers starting
 *   with 0 or matching a known local length. If no default is configured, local
 *   numbers are rejected rather than silently assumed.
 * - Rejects clearly invalid formats
 */
export function normalizePhoneE164(
  phone: string | null | undefined,
  options: PhoneNormalizationOptions = {}
): string | null {
  if (!phone) return null;

  const { defaultCountryCode } = options;

  // Strip whatsapp: prefix
  let cleaned = phone.replace(/^whatsapp:/, '');

  // Remove spaces, dashes, parentheses, dots
  cleaned = cleaned.replace(/[\s().-]/g, '');

  // Handle 00 international prefix
  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.substring(2);
  }

  // If starts with single 0 (local format), apply default country code
  if (cleaned.startsWith('0') && !cleaned.startsWith('00')) {
    if (defaultCountryCode) {
      cleaned = '+' + defaultCountryCode + cleaned.substring(1);
    } else {
      // No default → cannot resolve local number
      return null;
    }
  }

  // If bare digits matching a known local length for the configured country
  if (defaultCountryCode && /^\d+$/.test(cleaned)) {
    const expectedLengths = COUNTRY_LOCAL_LENGTHS[defaultCountryCode];
    if (expectedLengths?.includes(cleaned.length)) {
      cleaned = '+' + defaultCountryCode + cleaned;
    }
  }

  // Ensure + prefix for remaining bare digit strings (10-15 digits likely include country code)
  if (/^\d{10,15}$/.test(cleaned)) {
    cleaned = '+' + cleaned;
  }

  // Validate E.164 format: + followed by 7-15 digits
  if (!/^\+\d{7,15}$/.test(cleaned)) {
    return null;
  }

  return cleaned;
}

/**
 * Validates if a phone number is in valid E.164 format.
 */
export function isValidE164(phone: string): boolean {
  return /^\+\d{7,15}$/.test(phone);
}

/**
 * Returns a human-readable error for invalid phone numbers.
 */
export function getPhoneValidationError(
  phone: string | null | undefined,
  options: PhoneNormalizationOptions = {}
): string | null {
  if (!phone) return 'Phone number is required';

  const normalized = normalizePhoneE164(phone, options);
  if (normalized) return null;

  const cleaned = phone.replace(/[\s().-]/g, '');
  const digitsOnly = cleaned.replace(/\D/g, '');
  if (digitsOnly.length < 7) return 'Phone number too short (minimum 7 digits)';
  if (digitsOnly.length > 15) return 'Phone number too long (maximum 15 digits)';
  if (/[a-zA-Z]/.test(cleaned)) return 'Phone number contains letters';

  if (!options.defaultCountryCode && /^0\d+$/.test(cleaned)) {
    return 'Local number detected but no default country code is configured for this tenant. Store numbers in E.164 format (+<countryCode><number>).';
  }

  return 'Invalid phone number format. Expected E.164 format: +<countryCode><number>';
}