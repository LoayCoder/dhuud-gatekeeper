/**
 * Vite Plugin: Auto-update version.json before build
 * Updates version string and publishedAt timestamp using Saudi Arabia time
 */

import fs from 'fs';
import path from 'path';
import type { Plugin } from 'vite';

interface VersionInfo {
  version: string;
  buildDate: string;
  publishedAt: string;
  releaseNotes: string[];
  priority: string;
}

/**
 * Get current date/time in Saudi Arabia timezone (UTC+3)
 */
function getSaudiArabiaTime(): Date {
  const now = new Date();
  // Create a date string in Saudi Arabia timezone
  const saudiTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Riyadh' }));
  return saudiTime;
}

/**
 * Generate version string based on Saudi Arabia date: YYYY.MM.DD.XXX
 */
function generateVersionString(saudiDate: Date, existingVersion?: string): string {
  const year = saudiDate.getFullYear();
  const month = String(saudiDate.getMonth() + 1).padStart(2, '0');
  const day = String(saudiDate.getDate()).padStart(2, '0');
  
  const datePrefix = `${year}.${month}.${day}`;
  
  // Check if existing version is from the same day, if so increment build number
  let buildNumber = 1;
  if (existingVersion) {
    const existingPrefix = existingVersion.substring(0, 10); // YYYY.MM.DD
    if (existingPrefix === datePrefix) {
      const existingBuild = parseInt(existingVersion.split('.')[3] || '0', 10);
      buildNumber = existingBuild + 1;
    }
  }
  
  return `${datePrefix}.${String(buildNumber).padStart(3, '0')}`;
}

/**
 * Update version.json with current timestamp
 */
export function updateVersionJson(): void {
  const versionPath = path.resolve(process.cwd(), 'public/version.json');
  
  // Read existing version.json
  let existingData: VersionInfo = {
    version: '',
    buildDate: '',
    publishedAt: '',
    releaseNotes: ['Latest updates and improvements'],
    priority: 'normal'
  };
  
  try {
    const content = fs.readFileSync(versionPath, 'utf-8');
    existingData = JSON.parse(content);
  } catch (e) {
    console.log('[version-update] Creating new version.json');
  }
  
  const saudiTime = getSaudiArabiaTime();
  const utcNow = new Date().toISOString();
  
  const newVersion: VersionInfo = {
    version: generateVersionString(saudiTime, existingData.version),
    buildDate: utcNow,
    publishedAt: utcNow,
    releaseNotes: existingData.releaseNotes || ['Latest updates and improvements'],
    priority: existingData.priority || 'normal'
  };
  
  fs.writeFileSync(versionPath, JSON.stringify(newVersion, null, 2));
  
  console.log(`[version-update] Updated to v${newVersion.version}`);
  console.log(`[version-update] Published at: ${utcNow} (UTC)`);
}

/**
 * Vite plugin that updates version.json before production build
 */
export function versionUpdatePlugin(): Plugin {
  return {
    name: 'version-update',
    apply: 'build', // Only run during build, not dev
    buildStart() {
      console.log('[version-update] Updating version.json for production build...');
      updateVersionJson();
    }
  };
}

export default versionUpdatePlugin;
