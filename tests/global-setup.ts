// Global Setup - Dhuud Gatekeeper E2E Tests
// Runs before all tests

import { test as setup } from '@playwright/test';

const STORAGE_STATE = './tests/.auth/user1.json';

setup('global setup: create authenticated state for User 1 (Manager)', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Inject localStorage to bypass "What's New" modal
  await page.addInitScript(() => {
    localStorage.setItem('app-whats-new-seen-at', Date.now().toString());
  });

  // Navigate to login
  const baseUrl = process.env.E2E_BASE_URL || 'http://localhost:8080';
  await page.goto(`${baseUrl}/login`);
  
  // Quick check for the modal
  const closeButton = page.locator('button:has-text("Close"), button:has-text("Got it"), button:has-text("إغلاق")').first();
  if (await closeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await closeButton.click();
  }
  
  // Fill credentials for User 1
  await page.fill('input[type="email"], input[name="email"]', 'luay.dhuud.com');
  await page.fill('input[type="password"], input[name="password"]', '12345678');
  
  // Submit
  await page.click('button[type="submit"]');
  
  // Wait for login to complete
  await page.waitForURL('**/dashboard', { timeout: 15000 }).catch(() => {
    return page.waitForURL('**/home', { timeout: 10000 }).catch(() => {});
  });
  
  // Save storage state
  await context.storageState({ path: STORAGE_STATE });
  
  console.log('✅ Global setup: User 1 authenticated state saved');
  
  await context.close();
});

// Additional setup for other users (optional)
setup('global setup: create authenticated state for User 2', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Inject localStorage to bypass "What's New" modal
  await page.addInitScript(() => {
    localStorage.setItem('app-whats-new-seen-at', Date.now().toString());
  });

  const baseUrl = process.env.E2E_BASE_URL || 'http://localhost:8080';
  await page.goto(`${baseUrl}/login`);
  
  // Quick check for the modal
  const closeButton = page.locator('button:has-text("Close"), button:has-text("Got it"), button:has-text("إغلاق")').first();
  if (await closeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await closeButton.click();
  }
  
  await page.fill('input[type="email"], input[name="email"]', 'Loay.smartphoto@gmail.com');
  await page.fill('input[type="password"], input[name="password"]', '1410Loay1410');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 15000 }).catch(() => {});
  
  await context.storageState({ path: './tests/.auth/user2.json' });
  console.log('✅ Global setup: User 2 authenticated state saved');
  
  await context.close();
});

setup('global setup: create authenticated state for User 3', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Inject localStorage to bypass "What's New" modal
  await page.addInitScript(() => {
    localStorage.setItem('app-whats-new-seen-at', Date.now().toString());
  });

  const baseUrl = process.env.E2E_BASE_URL || 'http://localhost:8080';
  await page.goto(`${baseUrl}/login`);
  
  // Quick check for the modal
  const closeButton = page.locator('button:has-text("Close"), button:has-text("Got it"), button:has-text("إغلاق")').first();
  if (await closeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await closeButton.click();
  }
  
  await page.fill('input[type="email"], input[name="email"]', '1st.arabcoder@gmail.com');
  await page.fill('input[type="password"], input[name="password"]', '1410Loay1410');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 15000 }).catch(() => {});
  
  await context.storageState({ path: './tests/.auth/user3.json' });
  console.log('✅ Global setup: User 3 authenticated state saved');
  
  await context.close();
});

export {};