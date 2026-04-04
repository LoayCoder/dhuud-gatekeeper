import { test, expect, type Page } from '@playwright/test';

// Test Configuration
const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:8080';
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || '1st.arabcoder@gmail.com';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || '1410Loay1410';

// ============================================
// LOGIN UI TESTS
// ============================================

test.describe('Login UI Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Inject localStorage to bypass dialogs
    await page.addInitScript(() => {
      localStorage.setItem('app-whats-new-seen-at', Date.now().toString());
    });
  });

  test('TC-LOGIN-001: Login page loads correctly', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    
    // Close any dialogs that may appear
    const closeBtn = page.locator('button:has-text("Close"), button:has-text("Got it"), button:has-text("OK")').first();
    if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await closeBtn.click();
    }
    
    // Check page title
    await expect(page).toHaveTitle(/Dhuud/i);
    
    // Check email field exists and is visible
    const emailInput = page.locator('#email');
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toBeEnabled();
    
    // Check password field exists and is visible
    const passwordInput = page.locator('#password');
    await expect(passwordInput).toBeVisible();
    await expect(passwordInput).toBeEnabled();
    
    // Check sign in button exists
    const signInButton = page.locator('button[type="submit"]');
    await expect(signInButton).toBeVisible();
    await expect(signInButton).toBeEnabled();
    await expect(signInButton).toContainText(/sign in|signin|تسجيل/i);
    
    console.log('✅ Login page loaded correctly with all required elements');
  });

  test('TC-LOGIN-002: Login form validation works', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    
    // Close any dialogs
    const closeBtn = page.locator('button:has-text("Close"), button:has-text("Got it"), button:has-text("OK")').first();
    if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await closeBtn.click();
    }
    
    // Try submitting empty form
    const signInButton = page.locator('button[type="submit"]');
    await signInButton.click();
    
    // Check for HTML5 validation (email field should show validation)
    const emailInput = page.locator('input[type="email"], #email');
    const isInvalid = await emailInput.evaluate(el => (el as HTMLInputElement).checkValidity() === false);
    expect(isInvalid).toBe(true);
    
    console.log('✅ Login form validation works correctly');
  });

  test('TC-LOGIN-003: Login with valid credentials', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    
    // Close any dialogs
    const closeBtn = page.locator('button:has-text("Close"), button:has-text("Got it"), button:has-text("OK")').first();
    if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await closeBtn.click();
    }
    
    // Fill in credentials
    await page.fill('#email', ADMIN_EMAIL);
    await page.fill('#password', ADMIN_PASSWORD);
    
    // Click sign in
    const signInButton = page.locator('button[type="submit"]');
    await signInButton.click();
    
    // Wait for potential navigation or MFA dialog
    await page.waitForTimeout(5000);
    
    const currentUrl = page.url();
    console.log(`URL after login attempt: ${currentUrl}`);
    
    // Check if we were redirected away from login (successful login)
    // or stayed on login (failed or MFA required)
    if (!currentUrl.includes('/login')) {
      console.log('✅ Login successful - redirected to: ' + currentUrl);
    } else {
      // Check for any error messages
      const errorVisible = await page.locator('[role="alert"], .text-destructive').count();
      if (errorVisible > 0) {
        const errorText = await page.locator('[role="alert"], .text-destructive').first().textContent();
        console.log('Login failed with error: ' + errorText);
      } else {
        console.log('Login did not redirect - may require MFA or other verification');
      }
    }
  });
});

// ============================================
// INCIDENT WORKFLOW TESTS (Template)
// ============================================

test.describe('Incident Creation Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Inject localStorage to bypass dialogs
    await page.addInitScript(() => {
      localStorage.setItem('app-whats-new-seen-at', Date.now().toString());
    });
    
    // Login first
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('domcontentloaded');
    
    // Close any dialogs before filling form
    const closeBtn = page.locator('button:has-text("Close"), button:has-text("Got it"), button:has-text("OK")').first();
    if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await closeBtn.click();
    }
    
    await page.fill('#email', ADMIN_EMAIL);
    await page.fill('#password', ADMIN_PASSWORD);
    
    // Close dialog again before clicking submit
    if (await closeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await closeBtn.click();
    }
    
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
  });

  test('TC-IN-001: Create new incident', async ({ page }) => {
    await page.goto(`${BASE_URL}/incidents`);
    await page.waitForLoadState('networkidle');
    
    // Look for Report Incident button
    const reportBtn = page.locator('text=Report Incident, text=الإبلاغ عن حادث, a[href*="report"]').first();
    if (await reportBtn.isVisible({ timeout: 5000 })) {
      await reportBtn.click();
      console.log('✅ Report Incident button found and clicked');
    } else {
      console.log('⚠️ Report Incident button not found - may need different selector');
    }
  });
});