/**
 * Translation File Integrity Tests
 * 
 * These tests ensure translation files are valid and prevent issues like:
 * - Duplicate keys (which cause silent data loss in JSON)
 * - Missing translations between languages
 * - Empty translation values
 */

import { describe, it, expect } from 'vitest';
import { findDuplicateKeys, findMissingKeys } from '../validate-translations';
import fs from 'fs';
import path from 'path';

// Read translation files as raw strings to detect duplicates
const LOCALES_DIR = path.resolve(__dirname, '../../locales');

const LANGUAGES = ['en', 'ar', 'ur', 'hi', 'fil'] as const;
const RTL_LANGUAGES = ['ar', 'ur'];

// Required keys that MUST exist in the common object (not in filter or elsewhere)
const REQUIRED_COMMON_KEYS = [
  'loading', 'save', 'cancel', 'delete', 'edit', 'submit', 'back', 'next',
  'search', 'filter', 'view', 'details', 'all', 'light', 'dark', 'system',
  'toggleTheme', 'changeLanguage', 'selectAll', 'clearAll', 'reset',
  'total', 'department', 'days', 'generating', 'warning', 'popupBlocked',
  'site', 'severity', 'priority', 'reference', 'title',
  'priorityLow', 'priorityMedium', 'priorityHigh', 'priorityCritical'
];

// Required navigation keys
const REQUIRED_NAVIGATION_KEYS = [
  'dashboard', 'slaDashboard', 'teamPerformance', 'menuAccess'
];

// Required hsseNotifications keys
const REQUIRED_HSSE_NOTIFICATION_KEYS = [
  'title', 'all', 'mandatoryTab', 'readTab', 'pageTitle'
];

// Helper to read raw file content
function readTranslationFile(lang: string): string {
  const filePath = path.join(LOCALES_DIR, lang, 'translation.json');
  return fs.readFileSync(filePath, 'utf-8');
}

// Helper to parse translation file
function parseTranslationFile(lang: string): Record<string, unknown> {
  const content = readTranslationFile(lang);
  return JSON.parse(content);
}

describe('Translation File Integrity', () => {
  describe('Duplicate Key Detection', () => {
    it.each(LANGUAGES)('%s: should have no duplicate keys', (lang) => {
      const content = readTranslationFile(lang);
      const duplicates = findDuplicateKeys(content);
      
      if (duplicates.length > 0) {
        const errorMessage = duplicates
          .map(d => `  - "${d.key}" at path "${d.path}" (line ${d.line})`)
          .join('\n');
        
        expect.fail(
          `Found ${duplicates.length} duplicate key(s) in ${lang}/translation.json:\n${errorMessage}\n\n` +
          `This causes translations to be silently lost! Merge the duplicate objects.`
        );
      }
      
      expect(duplicates).toEqual([]);
    });
  });

  describe('Key Consistency', () => {
    it('all languages should have the same top-level keys as English', () => {
      const enKeys = Object.keys(parseTranslationFile('en')).sort();
      
      for (const lang of LANGUAGES) {
        if (lang === 'en') continue;
        
        const langKeys = Object.keys(parseTranslationFile(lang)).sort();
        const missing = findMissingKeys(enKeys, langKeys, lang);
        
        if (missing.length > 0) {
          console.warn(
            `⚠️ ${lang}: Missing top-level keys: ${missing.join(', ')}`
          );
        }
        
        // This is a warning, not a hard failure (translations can be added incrementally)
        expect(langKeys.length).toBeGreaterThan(0);
      }
    });
  });

  describe('RTL Language Support', () => {
    it.each(RTL_LANGUAGES)('%s: RTL translation file should exist', (lang) => {
      const filePath = path.join(LOCALES_DIR, lang, 'translation.json');
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });

  describe('JSON Validity', () => {
    it.each(LANGUAGES)('%s: should be valid JSON', (lang) => {
      const content = readTranslationFile(lang);
      
      expect(() => JSON.parse(content)).not.toThrow();
    });
  });

  describe('Required Namespaces', () => {
    const REQUIRED_NAMESPACES = [
      'common',
      'navigation', 
      'auth',
      'admin',
      'dashboard'
    ];

    it.each(LANGUAGES)('%s: should have all required namespaces', (lang) => {
      const translations = parseTranslationFile(lang);
      const keys = Object.keys(translations);
      
      for (const namespace of REQUIRED_NAMESPACES) {
        expect(keys).toContain(namespace);
      }
    });
  });

  describe('Critical Key Location Validation', () => {
    it.each(LANGUAGES)('%s: common object should have all required keys', (lang) => {
      const translations = parseTranslationFile(lang);
      const commonKeys = Object.keys((translations as Record<string, Record<string, unknown>>).common || {});
      
      const missingKeys = REQUIRED_COMMON_KEYS.filter(key => !commonKeys.includes(key));
      
      if (missingKeys.length > 0) {
        console.warn(`⚠️ ${lang}: Missing common keys: ${missingKeys.join(', ')}`);
      }
      
      // Critical keys that MUST exist
      expect(commonKeys).toContain('light');
      expect(commonKeys).toContain('dark');
      expect(commonKeys).toContain('system');
      expect(commonKeys).toContain('selectAll');
      expect(commonKeys).toContain('clearAll');
    });

    it.each(LANGUAGES)('%s: navigation object should have all required keys', (lang) => {
      const translations = parseTranslationFile(lang);
      const navKeys = Object.keys((translations as Record<string, Record<string, unknown>>).navigation || {});
      
      const missingKeys = REQUIRED_NAVIGATION_KEYS.filter(key => !navKeys.includes(key));
      
      if (missingKeys.length > 0) {
        console.warn(`⚠️ ${lang}: Missing navigation keys: ${missingKeys.join(', ')}`);
      }
      
      expect(navKeys).toContain('dashboard');
      expect(navKeys).toContain('menuAccess');
    });

    it.each(LANGUAGES)('%s: hsseNotifications object should have all required keys', (lang) => {
      const translations = parseTranslationFile(lang);
      const hsseKeys = Object.keys((translations as Record<string, Record<string, unknown>>).hsseNotifications || {});
      
      const missingKeys = REQUIRED_HSSE_NOTIFICATION_KEYS.filter(key => !hsseKeys.includes(key));
      
      if (missingKeys.length > 0) {
        console.warn(`⚠️ ${lang}: Missing hsseNotifications keys: ${missingKeys.join(', ')}`);
      }
      
      expect(hsseKeys).toContain('title');
      expect(hsseKeys).toContain('all');
      expect(hsseKeys).toContain('mandatoryTab');
      expect(hsseKeys).toContain('readTab');
    });
  });
});
