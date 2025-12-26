/**
 * Translation file validation utility
 * Detects duplicate keys in JSON files that would cause data loss
 */

export interface DuplicateKeyError {
  key: string;
  path: string;
  line: number;
}

/**
 * Finds duplicate keys in a JSON string at any nesting level.
 * Standard JSON.parse() silently overwrites duplicates - this catches them.
 */
export function findDuplicateKeys(jsonString: string): DuplicateKeyError[] {
  const duplicates: DuplicateKeyError[] = [];
  const lines = jsonString.split('\n');
  
  // Track keys at each nesting level
  const keyStackMap: Map<string, number>[] = [new Map()];
  let currentPath: string[] = [];
  let depth = 0;
  
  // Simple state machine to parse JSON structure
  let inString = false;
  let escapeNext = false;
  let currentKey = '';
  let collectingKey = false;
  let lineNumber = 1;
  let charIndex = 0;
  
  for (let i = 0; i < jsonString.length; i++) {
    const char = jsonString[i];
    
    if (char === '\n') {
      lineNumber++;
      charIndex = 0;
    } else {
      charIndex++;
    }
    
    if (escapeNext) {
      if (collectingKey) currentKey += char;
      escapeNext = false;
      continue;
    }
    
    if (char === '\\' && inString) {
      escapeNext = true;
      if (collectingKey) currentKey += char;
      continue;
    }
    
    if (char === '"') {
      if (!inString) {
        // Starting a string - check if it's a key (after { or ,)
        const beforeStr = jsonString.slice(Math.max(0, i - 50), i).trim();
        const lastSignificant = beforeStr[beforeStr.length - 1];
        if (lastSignificant === '{' || lastSignificant === ',') {
          collectingKey = true;
          currentKey = '';
        }
        inString = true;
      } else {
        // Ending a string
        if (collectingKey) {
          // Check if this is followed by a colon (making it a key)
          const afterStr = jsonString.slice(i + 1, i + 20).trim();
          if (afterStr[0] === ':') {
            const fullPath = currentPath.length > 0 
              ? `${currentPath.join('.')}.${currentKey}` 
              : currentKey;
            
            // Check for duplicate at current depth
            if (!keyStackMap[depth]) {
              keyStackMap[depth] = new Map();
            }
            
            const pathKey = `${depth}:${currentPath.join('.')}:${currentKey}`;
            if (keyStackMap[depth].has(pathKey)) {
              duplicates.push({
                key: currentKey,
                path: fullPath,
                line: lineNumber
              });
            } else {
              keyStackMap[depth].set(pathKey, lineNumber);
            }
          }
          collectingKey = false;
        }
        inString = false;
      }
      continue;
    }
    
    if (inString) {
      if (collectingKey) currentKey += char;
      continue;
    }
    
    // Track nesting
    if (char === '{') {
      // Look back to find the key for this object
      const beforeBrace = jsonString.slice(Math.max(0, i - 100), i);
      const keyMatch = beforeBrace.match(/"([^"]+)"\s*:\s*$/);
      if (keyMatch) {
        currentPath.push(keyMatch[1]);
      }
      depth++;
      if (!keyStackMap[depth]) {
        keyStackMap[depth] = new Map();
      }
    } else if (char === '}') {
      // Clear keys at current depth when leaving scope
      if (keyStackMap[depth]) {
        // Only clear keys for the current path
        const prefix = `${depth}:${currentPath.join('.')}:`;
        for (const key of keyStackMap[depth].keys()) {
          if (key.startsWith(prefix)) {
            keyStackMap[depth].delete(key);
          }
        }
      }
      depth--;
      currentPath.pop();
    }
  }
  
  return duplicates;
}

/**
 * Validates that all translation files have consistent top-level keys
 */
export function findMissingKeys(
  referenceKeys: string[],
  targetKeys: string[],
  targetLang: string
): string[] {
  return referenceKeys.filter(key => !targetKeys.includes(key));
}

/**
 * Finds empty translation values that might be missing
 */
export function findEmptyValues(
  obj: Record<string, unknown>,
  path: string = ''
): string[] {
  const emptyPaths: string[] = [];
  
  for (const [key, value] of Object.entries(obj)) {
    const currentPath = path ? `${path}.${key}` : key;
    
    if (typeof value === 'string' && value.trim() === '') {
      emptyPaths.push(currentPath);
    } else if (typeof value === 'object' && value !== null) {
      emptyPaths.push(...findEmptyValues(value as Record<string, unknown>, currentPath));
    }
  }
  
  return emptyPaths;
}
