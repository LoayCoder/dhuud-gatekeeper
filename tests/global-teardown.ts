// Global Teardown - Dhuud Gatekeeper E2E Tests
// Runs after all tests

import { test as teardown } from '@playwright/test';

teardown('global teardown: cleanup test data', async ({}) => {
  console.log('🧹 Running global teardown...');
  
  // Clean up any test artifacts
  // - Delete temporary files
  // - Clear test databases (if applicable)
  // - Reset test state
  
  console.log('✅ Global teardown complete');
});

export {};