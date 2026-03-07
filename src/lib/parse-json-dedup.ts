/**
 * Custom JSON parser that deep-merges duplicate keys instead of silently overwriting.
 * Standard JSON.parse takes the LAST occurrence of duplicate keys, losing earlier data.
 * This parser preserves ALL data by deep-merging objects with the same key.
 */

type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];
interface JsonObject { [key: string]: JsonValue }

function deepMerge(target: JsonObject, source: JsonObject): JsonObject {
  for (const [k, v] of Object.entries(source)) {
    if (
      v !== null && typeof v === 'object' && !Array.isArray(v) &&
      target[k] !== null && typeof target[k] === 'object' && !Array.isArray(target[k])
    ) {
      deepMerge(target[k] as JsonObject, v as JsonObject);
    } else {
      target[k] = v;
    }
  }
  return target;
}

export function parseJsonDedup(text: string): JsonObject {
  let i = 0;
  const len = text.length;

  function skipWS() {
    while (i < len && /\s/.test(text[i])) i++;
  }

  function parseString(): string {
    if (text[i] !== '"') throw new Error(`Expected " at pos ${i}`);
    i++;
    let s = '';
    while (i < len) {
      if (text[i] === '\\') {
        const next = text[i + 1];
        switch (next) {
          case '"': s += '"'; break;
          case '\\': s += '\\'; break;
          case '/': s += '/'; break;
          case 'b': s += '\b'; break;
          case 'f': s += '\f'; break;
          case 'n': s += '\n'; break;
          case 'r': s += '\r'; break;
          case 't': s += '\t'; break;
          case 'u': {
            const hex = text.slice(i + 2, i + 6);
            s += String.fromCharCode(parseInt(hex, 16));
            i += 4;
            break;
          }
          default: s += next;
        }
        i += 2;
        continue;
      }
      if (text[i] === '"') { i++; return s; }
      s += text[i];
      i++;
    }
    throw new Error('Unterminated string');
  }

  function parseValue(): JsonValue {
    skipWS();
    if (text[i] === '"') return parseString();
    if (text[i] === '{') return parseObject();
    if (text[i] === '[') return parseArray();
    if (text[i] === 't') { i += 4; return true; }
    if (text[i] === 'f') { i += 5; return false; }
    if (text[i] === 'n') { i += 4; return null; }
    const start = i;
    if (text[i] === '-') i++;
    while (i < len && /[0-9]/.test(text[i])) i++;
    if (text[i] === '.') { i++; while (i < len && /[0-9]/.test(text[i])) i++; }
    if (text[i] === 'e' || text[i] === 'E') {
      i++;
      if (text[i] === '+' || text[i] === '-') i++;
      while (i < len && /[0-9]/.test(text[i])) i++;
    }
    return Number(text.slice(start, i));
  }

  function parseArray(): JsonValue[] {
    i++;
    const arr: JsonValue[] = [];
    skipWS();
    if (text[i] === ']') { i++; return arr; }
    while (true) {
      arr.push(parseValue());
      skipWS();
      if (text[i] === ']') { i++; return arr; }
      if (text[i] === ',') { i++; continue; }
      throw new Error(`Expected , or ] at pos ${i}`);
    }
  }

  function parseObject(): JsonObject {
    i++;
    const obj: JsonObject = {};
    skipWS();
    if (text[i] === '}') { i++; return obj; }
    while (true) {
      skipWS();
      const key = parseString();
      skipWS();
      if (text[i] !== ':') throw new Error(`Expected : at pos ${i}`);
      i++;
      const value = parseValue();

      if (key in obj) {
        if (
          value !== null && typeof value === 'object' && !Array.isArray(value) &&
          obj[key] !== null && typeof obj[key] === 'object' && !Array.isArray(obj[key])
        ) {
          deepMerge(obj[key] as JsonObject, value as JsonObject);
        } else {
          obj[key] = value;
        }
      } else {
        obj[key] = value;
      }

      skipWS();
      if (text[i] === '}') { i++; return obj; }
      if (text[i] === ',') { i++; continue; }
      throw new Error(`Expected , or } at pos ${i}`);
    }
  }

  skipWS();
  return parseObject();
}
