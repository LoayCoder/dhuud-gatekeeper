#!/usr/bin/env node
/**
 * Consolidate Translation Files
 * 
 * 1. Parses JSON files with a custom parser that deep-merges duplicate keys
 *    (standard JSON.parse silently drops earlier occurrences)
 * 2. Merges Arabic namespace files into ar/translation.json
 * 3. Writes clean, deduplicated JSON
 * 
 * Usage: node scripts/consolidate-translations.cjs
 */

const fs = require('fs');
const path = require('path');

// ─── Deep Merge ──────────────────────────────────────────────────────
function deepMerge(target, source) {
  for (const [k, v] of Object.entries(source)) {
    if (v !== null && typeof v === 'object' && !Array.isArray(v) &&
        target[k] !== null && typeof target[k] === 'object' && !Array.isArray(target[k])) {
      deepMerge(target[k], v);
    } else {
      target[k] = v;
    }
  }
  return target;
}

// ─── Custom JSON Parser (preserves duplicate keys via deep-merge) ────
function parseJsonPreservingDuplicates(text) {
  const result = {};
  let i = 0;
  const len = text.length;

  function skipWS() {
    while (i < len && /\s/.test(text[i])) i++;
  }

  function parseString() {
    if (text[i] !== '"') throw new Error(`Expected " at pos ${i}, got '${text[i]}'`);
    i++; // skip "
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
            i += 4; // extra skip for \uXXXX
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

  function parseValue() {
    skipWS();
    if (text[i] === '"') return parseString();
    if (text[i] === '{') return parseObject();
    if (text[i] === '[') return parseArray();
    if (text[i] === 't') { i += 4; return true; }
    if (text[i] === 'f') { i += 5; return false; }
    if (text[i] === 'n') { i += 4; return null; }
    // number
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

  function parseArray() {
    i++; // skip [
    const arr = [];
    skipWS();
    if (text[i] === ']') { i++; return arr; }
    while (true) {
      arr.push(parseValue());
      skipWS();
      if (text[i] === ']') { i++; return arr; }
      if (text[i] === ',') { i++; continue; }
      throw new Error(`Expected , or ] at pos ${i}, got '${text[i]}'`);
    }
  }

  function parseObject() {
    i++; // skip {
    const obj = {};
    skipWS();
    if (text[i] === '}') { i++; return obj; }
    while (true) {
      skipWS();
      const key = parseString();
      skipWS();
      if (text[i] !== ':') throw new Error(`Expected : at pos ${i}`);
      i++;
      const value = parseValue();

      // Deep merge on duplicate key
      if (key in obj) {
        if (value !== null && typeof value === 'object' && !Array.isArray(value) &&
            obj[key] !== null && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
          deepMerge(obj[key], value);
        } else {
          obj[key] = value; // last wins for primitives
        }
      } else {
        obj[key] = value;
      }

      skipWS();
      if (text[i] === '}') { i++; return obj; }
      if (text[i] === ',') { i++; continue; }
      throw new Error(`Expected , or } at pos ${i}, got '${text[i]}'`);
    }
  }

  skipWS();
  const parsed = parseObject();
  return parsed;
}

// ─── Main ────────────────────────────────────────────────────────────
const root = path.resolve(__dirname, '..');
const arTransPath = path.join(root, 'src/locales/ar/translation.json');
const enTransPath = path.join(root, 'src/locales/en/translation.json');

// Namespace files to merge into ar/translation.json
const namespaceFiles = {
  auth:        path.join(root, 'src/locales/ar/auth.json'),
  common:      path.join(root, 'src/locales/ar/common.json'),
  security:    path.join(root, 'src/locales/ar/security.json'),
  incidents:   path.join(root, 'src/locales/ar/incidents.json'),
  assets:      path.join(root, 'src/locales/ar/assets.json'),
  contractors: path.join(root, 'src/locales/ar/contractors.json'),
};

// ─── Step 1: Process Arabic ──────────────────────────────────────────
console.log('=== Arabic translation ===');
console.log('Parsing ar/translation.json (with duplicate merge)...');
let arTrans = parseJsonPreservingDuplicates(
  fs.readFileSync(arTransPath, 'utf8')
);
console.log(`  Top-level keys: ${Object.keys(arTrans).length}`);

// Merge namespace files
for (const [ns, filePath] of Object.entries(namespaceFiles)) {
  if (!fs.existsSync(filePath)) {
    console.log(`  Skipping ${ns} (file not found)`);
    continue;
  }
  const nsData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const keyCount = Object.keys(nsData).length;

  if (ns === 'common') {
    // common.json has root-level keys (scanner, common, validation, etc.)
    // Merge at ROOT level since these keys exist at root in translation.json
    deepMerge(arTrans, nsData);
    console.log(`  Merged ${ns} namespace at ROOT (${keyCount} keys)`);
  } else {
    // Other namespaces merge under their key name
    if (!arTrans[ns] || typeof arTrans[ns] !== 'object') {
      arTrans[ns] = {};
    }
    deepMerge(arTrans[ns], nsData);
    console.log(`  Merged ${ns} namespace under "${ns}" key (${keyCount} keys)`);
  }
}

// Write clean Arabic file
fs.writeFileSync(arTransPath, JSON.stringify(arTrans, null, 2) + '\n', 'utf8');
console.log(`Wrote clean ar/translation.json (${Object.keys(arTrans).length} top-level keys)\n`);

// ─── Step 2: Process English ─────────────────────────────────────────
console.log('=== English translation ===');
console.log('Parsing en/translation.json (with duplicate merge)...');
let enTrans = parseJsonPreservingDuplicates(
  fs.readFileSync(enTransPath, 'utf8')
);
fs.writeFileSync(enTransPath, JSON.stringify(enTrans, null, 2) + '\n', 'utf8');
console.log(`Wrote clean en/translation.json (${Object.keys(enTrans).length} top-level keys)\n`);

// ─── Step 3: Validate ────────────────────────────────────────────────
console.log('=== Validation ===');
try {
  JSON.parse(fs.readFileSync(arTransPath, 'utf8'));
  console.log('✅ ar/translation.json is valid JSON');
} catch (e) {
  console.error('❌ ar/translation.json is INVALID:', e.message);
  process.exit(1);
}
try {
  JSON.parse(fs.readFileSync(enTransPath, 'utf8'));
  console.log('✅ en/translation.json is valid JSON');
} catch (e) {
  console.error('❌ en/translation.json is INVALID:', e.message);
  process.exit(1);
}

console.log('\nDone! Now you can safely delete the namespace files.');
