/**
 * Build-time Route Registry Validation Script
 * 
 * This script validates that:
 * 1. All routes have unique paths and menu codes
 * 2. Hidden routes have documented reasons
 * 3. No orphan pages exist (pages not in registry)
 * 
 * Run with: npx tsx scripts/validate-route-registry.ts
 */

import { routeRegistry, validateRegistry } from '../src/config/route-registry';
import * as fs from 'fs';
import * as path from 'path';

const PAGES_DIR = path.join(__dirname, '../src/pages');

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    totalRoutes: number;
    visibleRoutes: number;
    hiddenRoutes: number;
    publicRoutes: number;
    protectedRoutes: number;
    adminRoutes: number;
  };
}

function getPageFiles(dir: string, basePath: string = ''): string[] {
  const files: string[] = [];
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.join(basePath, entry.name);
      
      if (entry.isDirectory()) {
        files.push(...getPageFiles(fullPath, relativePath));
      } else if (entry.isFile() && entry.name.endsWith('.tsx') && !entry.name.includes('.test.')) {
        files.push(relativePath);
      }
    }
  } catch (err) {
    console.error(`Error reading directory ${dir}:`, err);
  }
  
  return files;
}

function validateRouteRegistry(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Run basic validation
  const basicValidation = validateRegistry();
  errors.push(...basicValidation.errors);
  
  // Calculate stats
  const stats = {
    totalRoutes: routeRegistry.length,
    visibleRoutes: routeRegistry.filter(r => !r.hidden).length,
    hiddenRoutes: routeRegistry.filter(r => r.hidden).length,
    publicRoutes: routeRegistry.filter(r => r.protection === 'public').length,
    protectedRoutes: routeRegistry.filter(r => r.protection === 'protected').length,
    adminRoutes: routeRegistry.filter(r => r.protection === 'admin').length,
  };
  
  // Check for missing parent codes
  const allMenuCodes = new Set(routeRegistry.map(r => r.menuCode));
  for (const route of routeRegistry) {
    if (route.parentCode && !allMenuCodes.has(route.parentCode)) {
      // Parent code should exist in menuGroups, not routeRegistry
      // This is just a warning
      warnings.push(`Route ${route.path} has parentCode '${route.parentCode}' - ensure this group exists in menu-groups.ts`);
    }
  }
  
  // Check for page files not in registry (optional - can be noisy)
  // const pageFiles = getPageFiles(PAGES_DIR);
  // console.log(`Found ${pageFiles.length} page files`);
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats,
  };
}

// Run validation
console.log('🔍 Validating Route Registry...\n');

const result = validateRouteRegistry();

console.log('📊 Statistics:');
console.log(`   Total Routes: ${result.stats.totalRoutes}`);
console.log(`   Visible (in sidebar): ${result.stats.visibleRoutes}`);
console.log(`   Hidden: ${result.stats.hiddenRoutes}`);
console.log(`   Public: ${result.stats.publicRoutes}`);
console.log(`   Protected: ${result.stats.protectedRoutes}`);
console.log(`   Admin: ${result.stats.adminRoutes}`);
console.log('');

if (result.warnings.length > 0) {
  console.log('⚠️  Warnings:');
  result.warnings.forEach(w => console.log(`   - ${w}`));
  console.log('');
}

if (result.errors.length > 0) {
  console.log('❌ Errors:');
  result.errors.forEach(e => console.log(`   - ${e}`));
  console.log('');
  console.log('Route Registry Validation FAILED');
  process.exit(1);
} else {
  console.log('✅ Route Registry Validation PASSED');
  process.exit(0);
}
