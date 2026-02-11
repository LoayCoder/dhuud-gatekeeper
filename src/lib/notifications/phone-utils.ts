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
 * Normalizes a phone number to E.164 format.
 * Returns null if the number cannot be normalized.
 *
 * Rules:
 * - Strips whitespace, dashes, parentheses
 * - Converts 00-prefix to +
 * - Assumes Saudi Arabia (+966) for local numbers starting with 0 or 9-digit numbers
 * - Rejects clearly invalid formats
 */
export function normalizePhoneE164(phone: string | null | undefined): string | null {
  if (!phone) return null;

  // Strip whatsapp: prefix
  let cleaned = phone.replace(/^whatsapp:/, '');

  // Remove spaces, dashes, parentheses, dots
  cleaned = cleaned.replace(/[\s\-\(\)\.]/g, '');

  // Handle 00 international prefix
  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.substring(2);
  }

  // If starts with single 0, assume Saudi Arabia
  if (cleaned.startsWith('0') && !cleaned.startsWith('00')) {
    cleaned = '+966' + cleaned.substring(1);
  }

  // If just 9 digits, assume Saudi Arabia
  if (/^\d{9}$/.test(cleaned)) {
    cleaned = '+966' + cleaned;
  }

  // Ensure + prefix
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
export function getPhoneValidationError(phone: string | null | undefined): string | null {
  if (!phone) return 'Phone number is required';

  const normalized = normalizePhoneE164(phone);
  if (normalized) return null;

  const cleaned = phone.replace(/[\s\-\(\)\.]/g, '');
  const digitsOnly = cleaned.replace(/\D/g, '');
  if (digitsOnly.length < 7) return 'Phone number too short (minimum 7 digits)';
  if (digitsOnly.length > 15) return 'Phone number too long (maximum 15 digits)';
  if (/[a-zA-Z]/.test(cleaned)) return 'Phone number contains letters';

  return 'Invalid phone number format. Expected E.164 format: +<countryCode><number>';
}
