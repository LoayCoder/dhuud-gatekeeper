import type { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Running global teardown...');
  // Clean up any test artifacts if needed
  console.log('✅ Global teardown complete');
}

export default globalTeardown;
