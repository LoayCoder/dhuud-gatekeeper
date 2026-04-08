import { chromium, type FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const AUTH_DIR = path.join(__dirname, '.auth');

async function globalSetup(config: FullConfig) {
  // Ensure .auth directory exists
  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  }

  const baseUrl = process.env.E2E_BASE_URL || 'http://localhost:8080';
  const browser = await chromium.launch();

  // User 1 - Manager
  await authenticateUser(browser, baseUrl, {
    email: 'luay@dhuud.com',
    password: '12345678',
    storagePath: path.join(AUTH_DIR, 'user1.json'),
    label: 'User 1 (Manager)',
  });

  // User 2
  await authenticateUser(browser, baseUrl, {
    email: 'Loay.smartphoto@gmail.com',
    password: '1410Loay1410',
    storagePath: path.join(AUTH_DIR, 'user2.json'),
    label: 'User 2',
  });

  // User 3
  await authenticateUser(browser, baseUrl, {
    email: '1st.arabcoder@gmail.com',
    password: '1410Loay1410',
    storagePath: path.join(AUTH_DIR, 'user3.json'),
    label: 'User 3',
  });

  await browser.close();
}

async function authenticateUser(
  browser: any,
  baseUrl: string,
  opts: { email: string; password: string; storagePath: string; label: string }
) {
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.addInitScript(() => {
    localStorage.setItem('app-whats-new-seen-at', Date.now().toString());
  });

  await page.goto(`${baseUrl}/login`);

  // Dismiss any dialog
  const closeButton = page
    .locator('button:has-text("Close"), button:has-text("Got it"), button:has-text("إغلاق")')
    .first();
  if (await closeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await closeButton.click();
  }

  // Fill credentials using id-based selectors
  await page.fill('#email', opts.email);
  await page.fill('#password', opts.password);
  await page.click('button[type="submit"]');

  // Wait for navigation after login
  await page.waitForURL('**/dashboard', { timeout: 15000 }).catch(() => {
    return page.waitForURL('**/home', { timeout: 10000 }).catch(() => {});
  });

  await context.storageState({ path: opts.storagePath });
  console.log(`✅ Global setup: ${opts.label} authenticated state saved`);

  await context.close();
}

export default globalSetup;
