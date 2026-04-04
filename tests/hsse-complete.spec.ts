// ============================================
// Dhuud Gatekeeper E2E Tests - Ready to Run
// Branch: mainv1_offlinemood
// Generated: April 1, 2026
// ============================================

import { test, expect, type Page } from '@playwright/test';

// ============================================
// TEST USERS & CREDENTIALS
// ============================================

export const TEST_USERS = {
  user1: { email: 'luay@dhuud.com', password: '12345678' },
  user2: { email: 'Loay.smartphoto@gmail.com', password: '1410Loay1410' },
  user3: { email: '1st.arabcoder@gmail.com', password: '1410Loay1410' },
};

// ============================================
// TEST DATA
// ============================================

export const TEST_DATA = {
  incidents: {
    basic: {
      title: `Test Incident - ${Date.now()}`,
      description: 'Test incident description',
      event_type: 'incident',
      severity: 'medium',
      has_injury: false,
      has_damage: false,
    },
    withInjury: {
      title: `Injury Incident - ${Date.now()}`,
      description: 'Worker injured',
      event_type: 'incident',
      severity: 'high',
      has_injury: true,
    },
    withDamage: {
      title: `Damage Incident - ${Date.now()}`,
      description: 'Property damaged',
      event_type: 'incident',
      severity: 'medium',
      has_damage: true,
    },
  },
};

// ============================================
// INVESTIGATION SCENARIOS
// ============================================

export const INVESTIGATION_SCENARIOS = {
  safety: {
    title: 'Scaffold Safety Violation',
    description: 'Worker observed on 4m scaffold without harness.',
    rca_elements: ['Inadequate supervision', 'procedure failure'],
    capa: ['Retrain team', 'Install guardrails'],
  },
  injury: {
    title: 'Hand Crush Incident (LTI)',
    description: 'Tech hand caught in conveyor.',
    rca_elements: ['Missing interlock', 'LOTO failure'],
    capa: ['Install magnetic interlocks', 'LOTO training'],
  },
  property: {
    title: 'Warehouse Forklift Collision',
    description: 'Forklift struck racking.',
    rca_elements: ['Speed exceeding limit', 'lack of bollards'],
    capa: ['Install bollards', 'Speed limiters'],
  },
  environmental: {
    title: 'Hydraulic Oil Soil Leak',
    description: '50L oil leaked from crane.',
    rca_elements: ['Maintenance delay', 'hose burst'],
    capa: ['Upgrade hoses', 'Stricter inspection'],
  },
  security: {
    title: 'Copper Cable Theft',
    description: 'Cabling stolen from yard.',
    rca_elements: ['Lighting dead spot', 'missed patrol'],
    capa: ['Motion floodlights', 'Electronic checkpoints'],
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

async function login(page: Page, userKey: keyof typeof TEST_USERS) {
  const user = TEST_USERS[userKey];
  await page.addInitScript(() => localStorage.setItem('app-whats-new-seen-at', Date.now().toString()));
  await page.goto('/login');
  await closeAnyDialog(page);
  await page.fill('#email', user.email);
  await page.fill('#password', user.password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);
  await closeAnyDialog(page);
}

async function closeAnyDialog(page: Page) {
  const btn = page.locator('button:has-text("Close"), button:has-text("Got it"), button:has-text("إغلاق")').first();
  if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) await btn.click();
}

async function navigateToHSSE(page: Page) {
  await page.goto('/incidents');
  await page.waitForLoadState('networkidle');
}

async function createIncident(page: Page, data: any) {
  await page.click('button:has-text("Report Incident"), button:has-text("إبلاغ حادث")');
  await page.fill('input[name="title"]', data.title);
  await page.fill('textarea[name="description"]', data.description);
  await page.selectOption('select[name="event_type"]', data.event_type);
  if (data.severity) await page.selectOption('select[name="severity"]', data.severity);
  if (data.has_injury) await page.check('input[name="has_injury"]');
  if (data.has_damage) await page.check('input[name="has_damage"]');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
  const firstItem = page.locator('table tr, .incident-card').first();
  await firstItem.click();
}

// ============================================
// TEST SUITES
// ============================================

test.describe('Investigation Scenarios', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'user1');
    await navigateToHSSE(page);
  });

  for (const [key, scenario] of Object.entries(INVESTIGATION_SCENARIOS)) {
    test(`TC-SCEN-${key}: ${scenario.title} Workflow`, async ({ page }) => {
      await createIncident(page, { ...TEST_DATA.incidents.basic, title: scenario.title });
      await performFullInvestigation(page, scenario);
    });
  }
});

async function performFullInvestigation(page: Page, scenario: any) {
  console.log(`🚀 Investigating: ${scenario.title}`);
  await closeAnyDialog(page);

  // Triage
  const triageBtn = page.locator('button:has-text("Needs Investigation"), button:has-text("تحتاج إلى تحقيق")').first();
  if (await triageBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await triageBtn.click();
    await page.fill('textarea', 'Automated investigation');
    await page.click('button:has-text("Confirm"), button:has-text("تأكيد")');
    await page.waitForTimeout(2000);
  }

  // Assignment
  const assignBtn = page.locator('button:has-text("Assign to Me"), button:has-text("تعييني")').first();
  if (await assignBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await assignBtn.click();
    await page.click('button:has-text("Confirm Assignment")');
    await page.waitForTimeout(2000);
  }

  // Analysis
  await page.click('button[role="tab"]:has-text("Analysis"), button[role="tab"]:has-text("تحليل")');
  const whyInputs = page.locator('input[placeholder*="Why"]');
  for (let i = 0; i < Math.min(2, scenario.rca_elements.length); i++) {
    if (await whyInputs.nth(i).isVisible()) await whyInputs.nth(i).fill(scenario.rca_elements[i]);
  }
  await page.click('button:has-text("Save Analysis"), button:has-text("Save RCA")');
  await page.waitForTimeout(2000);

  // CAPA
  await page.click('button[role="tab"]:has-text("Actions"), button[role="tab"]:has-text("الإجراءات")');
  for (const action of scenario.capa.slice(0, 1)) {
    await page.click('button:has-text("Add Action")');
    await page.fill('input[name="title"]', action);
    await page.click('button:has-text("Create")');
    await page.waitForTimeout(1000);
  }

  // Closure
  await page.click('button[role="tab"]:has-text("Submit"), button[role="tab"]:has-text("إرسال")');
  await page.click('button:has-text("Confirm & Submit"), button:has-text("Close Investigation")');
  await page.waitForTimeout(2000);
  console.log(`✅ Closed: ${scenario.title}`);
}