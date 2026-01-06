/**
 * Generate a valid code from a name string.
 * Converts "Fire Safety Equipment" → "FIRE_SAFETY_EQUIPMENT"
 * Converts "CO2 6kg" → "CO2_6KG"
 */
export function generateCodeFromName(name: string, allowNumbers = false): string {
  if (!name) return '';
  
  const regex = allowNumbers ? /[^A-Z0-9\s]/g : /[^A-Z\s]/g;
  
  return name
    .trim()
    .toUpperCase()
    .replace(regex, '')      // Remove invalid chars
    .replace(/\s+/g, '_')    // Replace spaces with underscores
    .replace(/_+/g, '_')     // Remove duplicate underscores
    .replace(/^_|_$/g, '');  // Trim leading/trailing underscores
}
