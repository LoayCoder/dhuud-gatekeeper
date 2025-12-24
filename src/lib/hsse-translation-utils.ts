/**
 * HSSE Translation Utilities
 * Handles translation key normalization for database values (snake_case) 
 * to translation keys (camelCase or snake_case fallback)
 */

import type { TFunction } from 'i18next';
import { HSSE_SUBTYPES } from './hsse-event-types';

/**
 * Converts snake_case string to camelCase
 * Example: "unsafe_condition" → "unsafeCondition"
 */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Finds the HSSE event type for a given subtype value
 * Example: "fall_from_height" → "safety"
 */
export function getHsseEventTypeForSubtype(subtype: string): string | null {
  for (const [eventType, subtypes] of Object.entries(HSSE_SUBTYPES)) {
    if (subtypes.some(s => s.value === subtype)) {
      return eventType;
    }
  }
  return null;
}

/**
 * Gets the translated label for an observation type or incident subtype
 * Derives HSSE event type from the subtype when not provided
 */
export function getSubtypeTranslation(
  t: TFunction,
  eventType: string,
  subtype: string,
  incidentType?: string
): string {
  const camelSubtype = snakeToCamel(subtype);
  
  if (eventType === 'observation') {
    // Try camelCase key first, then snake_case, then raw value
    const camelKey = `incidents.observationTypes.${camelSubtype}`;
    const snakeKey = `incidents.observationTypes.${subtype}`;
    
    const camelTranslation = t(camelKey, { defaultValue: '' });
    if (camelTranslation && camelTranslation !== camelKey) {
      return camelTranslation;
    }
    
    const snakeTranslation = t(snakeKey, { defaultValue: '' });
    if (snakeTranslation && snakeTranslation !== snakeKey) {
      return snakeTranslation;
    }
    
    return subtype; // Fallback to raw value
  } else {
    // For incidents, derive HSSE event type from the subtype value
    const hsseEventType = getHsseEventTypeForSubtype(subtype);
    const camelHsseEventType = hsseEventType ? snakeToCamel(hsseEventType) : '';
    
    // Try multiple key paths in order of preference
    const paths = [
      // Primary: use derived HSSE event type with camelCase subtype
      camelHsseEventType ? `incidents.hsseSubtypes.${camelHsseEventType}.${camelSubtype}` : '',
      // Fallback: snake_case event type with snake_case subtype  
      hsseEventType ? `incidents.hsseSubtypes.${hsseEventType}.${subtype}` : '',
      // Legacy: use provided incidentType if available
      incidentType ? `incidents.subtypes.${snakeToCamel(incidentType)}.${camelSubtype}` : '',
      incidentType ? `incidents.subtypes.${incidentType}.${subtype}` : '',
    ].filter(Boolean);
    
    for (const path of paths) {
      const translation = t(path, { defaultValue: '' });
      if (translation && translation !== path) {
        return translation;
      }
    }
    
    return subtype; // Fallback to raw value
  }
}
