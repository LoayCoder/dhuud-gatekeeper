/**
 * HSSE Translation Utilities
 * Handles translation key normalization for database values (snake_case) 
 * to translation keys (camelCase or snake_case fallback)
 */

import type { TFunction } from 'i18next';

/**
 * Converts snake_case string to camelCase
 * Example: "unsafe_condition" → "unsafeCondition"
 */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Gets the translated label for an observation type or incident subtype
 * Tries camelCase first, then snake_case as fallback
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
    // For incidents, use the HSSE subtypes structure
    const camelIncidentType = incidentType ? snakeToCamel(incidentType) : '';
    
    // Try multiple key paths
    const paths = [
      `incidents.hsseSubtypes.${camelIncidentType}.${camelSubtype}`,
      `incidents.hsseSubtypes.${incidentType}.${subtype}`,
      `incidents.subtypes.${incidentType}.${subtype}`,
      `incidents.subtypes.${camelIncidentType}.${camelSubtype}`,
    ];
    
    for (const path of paths) {
      const translation = t(path, { defaultValue: '' });
      if (translation && translation !== path) {
        return translation;
      }
    }
    
    return subtype; // Fallback to raw value
  }
}
