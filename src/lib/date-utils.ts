import { format, formatDistanceToNow, formatRelative, type Locale } from 'date-fns';
import { ar } from 'date-fns/locale/ar';
import { enUS } from 'date-fns/locale/en-US';

const RTL_LANGUAGES = ['ar', 'ur'];

/**
 * Get the date-fns locale based on the current document language
 */
export function getDateLocale(): Locale {
  const lang = document.documentElement.lang || 'en';
  // Arabic locale works well for Urdu too
  return RTL_LANGUAGES.includes(lang) ? ar : enUS;
}

/**
 * Format a date with automatic locale detection
 */
export function formatDate(
  date: Date | string | number,
  formatStr: string = 'PPP'
): string {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  return format(dateObj, formatStr, { locale: getDateLocale() });
}

/**
 * Format a date with time
 */
export function formatDateTime(date: Date | string | number): string {
  return formatDate(date, 'PPP HH:mm');
}

/**
 * Format just the time
 */
export function formatTime(date: Date | string | number): string {
  return formatDate(date, 'HH:mm');
}

/**
 * Format as relative time (e.g., "3 days ago")
 */
export function formatRelativeTime(date: Date | string | number): string {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  return formatDistanceToNow(dateObj, { 
    addSuffix: true, 
    locale: getDateLocale() 
  });
}

/**
 * Format relative to a base date (e.g., "yesterday at 5:00 PM")
 */
export function formatRelativeToNow(date: Date | string | number): string {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  return formatRelative(dateObj, new Date(), { locale: getDateLocale() });
}

/**
 * Format a short date (e.g., "Dec 5")
 */
export function formatShortDate(date: Date | string | number): string {
  return formatDate(date, 'MMM d');
}

/**
 * Format a full date with day name (e.g., "Thursday, December 5, 2024")
 */
export function formatFullDate(date: Date | string | number): string {
  return formatDate(date, 'PPPP');
}
