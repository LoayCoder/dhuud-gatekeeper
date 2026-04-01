import { test, expect, type Page } from '@playwright/test';

// Test Configuration
const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:5173';
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'admin@test.com';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'testpassword';

// Test Data
const testIncident = {
  title: 'Test Incident - E2E',
  description: 'This is a test incident created by E2E tests',
  event_type: 'incident',
  severity: 'medium',
  location: 'Test Location',
  has_injury: false,
  has_damage: false,
};

const testObservation = {
  title: 'Test Observation - E2E',
  description: 'This is a test observation created by E2E tests',
  event_type: 'observation',
  risk_rating: 'low',
};

// Helper Functions
async function loginAsAdmin(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('[name="email"]', ADMIN_EMAIL);
  await page.fill('[name="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE_URL}/dashboard`);
}

async function navigateToHSSEEvents(page: Page) {
  await page.click('text=HSSE');
  await page.click('text=Events');
  await page.waitForURL('**/incidents/**');
}

// ============================================
// INCIDENT WORKFLOW TESTS
// ============================================

test.describe('Incident Creation Flow', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('TC-IN-001: Create new incident as Employee', async ({ page }) => {
    await navigateToHSSEEvents(page);
    
    // Click "Report Incident" button
    await page.click('text=Report Incident');
    await page.waitForSelector('form');
    
    // Fill incident form
    await page.fill('[name="title"]', testIncident.title);
    await page.fill('[name="description"]', testIncident.description);
    
    // Select event type
    await page.selectOption('[name="event_type"]', 'incident');
    
    // Select severity
    await page.selectOption('[name="severity"]', testIncident.severity!);
    
    // Fill location
    await page.fill('[name="location"]', testIncident.location!);
    
    // Set no injury/damage
    await page.uncheck('[name="has_injury"]');
    await page.uncheck('[name="has_damage"]');
    
    // Submit
    await page.click('button:has-text("Submit")');
    
    // Verify success
    await expect(page.locator('text=Incident created successfully')).toBeVisible({ timeout: 10000 });
    
    // Verify redirect to incident list
    await expect(page).toHaveURL(/.*incidents.*/);
  });

  test('TC-IN-002: Validate required fields', async ({ page }) => {
    await navigateToHSSEEvents(page);
    await page.click('text=Report Incident');
    
    // Try to submit without required fields
    await page.click('button:has-text("Submit")');
    
    // Verify validation errors
    await expect(page.locator('text=Title is required')).toBeVisible();
    await expect(page.locator('text=Description is required')).toBeVisible();
  });

  test('TC-IN-003: Create incident with injury', async ({ page }) => {
    await navigateToHSSEEvents(page);
    await page.click('text=Report Incident');
    
    await page.fill('[name="title"]', 'Incident with Injury');
    await page.fill('[name="description"]', 'Worker injured');
    await page.check('[name="has_injury"]');
    
    // Fill injury details
    await page.fill('[name="injury_details.count"]', '1');
    await page.fill('[name="injury_details.description"]', 'Minor cut');
    
    await page.click('button:has-text("Submit")');
    
    await expect(page.locator('text=Incident created successfully')).toBeVisible();
  });

  test('TC-IN-004: Create incident with property damage', async ({ page }) => {
    await navigateToHSSEEvents(page);
    await page.click('text=Report Incident');
    
    await page.fill('[name="title"]', 'Incident with Damage');
    await page.fill('[name="description"]', 'Equipment damaged');
    await page.check('[name="has_damage"]');
    
    // Fill damage details
    await page.fill('[name="damage_details.description"]', 'Equipment broken');
    await page.fill('[name="damage_details.estimated_cost"]', '500');
    
    await page.click('button:has-text("Submit")');
    
    await expect(page.locator('text=Incident created successfully')).toBeVisible();
  });
});

test.describe('Incident List & Filters', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await navigateToHSSEEvents(page);
  });

  test('TC-IN-005: View incident list', async ({ page }) => {
    // Verify table loads
    await expect(page.locator('table')).toBeVisible();
    
    // Verify columns
    await expect(page.locator('th:has-text("Reference")')).toBeVisible();
    await expect(page.locator('th:has-text("Title")')).toBeVisible();
    await expect(page.locator('th:has-text("Status")')).toBeVisible();
    await expect(page.locator('th:has-text("Severity")')).toBeVisible();
  });

  test('TC-IN-006: Filter by status', async ({ page }) => {
    // Open filters
    await page.click('text=Filters');
    
    // Select status filter
    await page.selectOption('[name="status"]', 'submitted');
    
    // Apply filter
    await page.click('button:has-text("Apply")');
    
    // Verify filtered results
    await expect(page.locator('text=Showing filtered results')).toBeVisible();
  });

  test('TC-IN-007: Search incidents', async ({ page }) => {
    // Use search
    await page.fill('[name="search"]', 'Test');
    await page.press('[name="search"]', 'Enter');
    
    // Wait for results
    await page.waitForTimeout(1000);
  });
});

test.describe('Incident Detail View', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await navigateToHSSEEvents(page);
  });

  test('TC-IN-008: View incident details', async ({ page }) => {
    // Click on first incident
    await page.click('table tbody tr:first-child');
    
    // Verify detail page loads
    await expect(page.locator('h1:has-text("Incident Details")')).toBeVisible();
    
    // Verify key sections
    await expect(page.locator('text=Description')).toBeVisible();
    await expect(page.locator('text=Timeline')).toBeVisible();
    await expect(page.locator('text=Attachments')).toBeVisible();
  });

  test('TC-IN-009: Add comment to incident', async ({ page }) => {
    await page.click('table tbody tr:first-child');
    
    // Add comment
    await page.fill('[name="comment"]', 'Test comment');
    await page.click('button:has-text("Add Comment")');
    
    // Verify comment added
    await expect(page.locator('text=Test comment')).toBeVisible();
  });
});

// ============================================
// OBSERVATION WORKFLOW TESTS
// ============================================

test.describe('Observation Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('TC-OB-001: Create observation', async ({ page }) => {
    await navigateToHSSEEvents(page);
    await page.click('text=Report Observation');
    
    await page.fill('[name="title"]', testObservation.title);
    await page.fill('[name="description"]', testObservation.description);
    await page.selectOption('[name="risk_rating"]', testObservation.risk_rating!);
    
    await page.click('button:has-text("Submit")');
    
    await expect(page.locator('text=Observation created successfully')).toBeVisible();
  });

  test('TC-OB-002: Escalate observation to incident', async ({ page }) => {
    await navigateToHSSEEvents(page);
    
    // Find and click on an observation
    await page.click('table tbody tr:first-child');
    
    // Click escalate button
    await page.click('button:has-text("Escalate to Incident")');
    
    // Confirm escalation
    await page.click('button:has-text("Confirm")');
    
    // Verify escalation
    await expect(page.locator('text=Escalated to incident')).toBeVisible();
  });
});

// ============================================
// INVESTIGATION WORKFLOW TESTS
// ============================================

test.describe('Investigation Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('TC-INV-001: Start investigation', async ({ page }) => {
    await navigateToHSSEEvents(page);
    
    // Click on incident that needs investigation
    await page.click('table tbody tr:first-child');
    
    // Click "Start Investigation"
    await page.click('button:has-text("Start Investigation")');
    
    // Verify investigation started
    await expect(page.locator('text=Investigation started')).toBeVisible();
  });

  test('TC-INV-002: Assign investigation team', async ({ page }) => {
    await navigateToHSSEEvents(page);
    
    // Go to investigation workspace
    await page.click('text=Investigation Workspace');
    
    // Select incident
    await page.click('text=Select Incident');
    
    // Click assign team
    await page.click('button:has-text("Assign Team")');
    
    // Select investigators
    await page.check('input[name="investigator_1"]');
    await page.click('button:has-text("Save")');
    
    // Verify team assigned
    await expect(page.locator('text=Team assigned successfully')).toBeVisible();
  });

  test('TC-INV-003: Add evidence', async ({ page }) => {
    await navigateToHSSEEvents(page);
    await page.click('text=Investigation Workspace');
    await page.click('text=Select Incident');
    
    // Add evidence section
    await page.click('button:has-text("Add Evidence")');
    
    // Fill evidence form
    await page.fill('[name="evidence_title"]', 'Test Evidence');
    await page.fill('[name="evidence_description"]', 'Test evidence description');
    
    // Upload file
    await page.setInputFiles('[name="evidence_file"]', 'tests/fixtures/test-image.png');
    
    await page.click('button:has-text("Save")');
    
    await expect(page.locator('text=Evidence added')).toBeVisible();
  });

  test('TC-INV-004: Complete Five Whys analysis', async ({ page }) => {
    await navigateToHSSEEvents(page);
    await page.click('text=Investigation Workspace');
    await page.click('text=Select Incident');
    
    // Open Five Whys
    await page.click('text=Five Whys Analysis');
    
    // Fill Why 1
    await page.fill('[name="why_1"]', 'Why did this happen?');
    await page.fill('[name="answer_1"]', 'Because...');
    
    // Add more whys
    await page.click('button:has-text("Add Why")');
    
    await page.click('button:has-text("Save")');
    
    await expect(page.locator('text=Five Whys saved')).toBeVisible();
  });

  test('TC-INV-005: Add corrective actions', async ({ page }) => {
    await navigateToHSSEEvents(page);
    await page.click('text=Investigation Workspace');
    await page.click('text=Select Incident');
    
    // Open corrective actions
    await page.click('text=Corrective Actions');
    await page.click('button:has-text("Add Action")');
    
    // Fill action form
    await page.fill('[name="action_title"]', 'Prevent recurrence');
    await page.fill('[name="action_description"]', 'Implement safety measures');
    await page.fill('[name="due_date"]', '2026-04-30');
    
    await page.click('button:has-text("Save")');
    
    await expect(page.locator('text=Action created')).toBeVisible();
  });

  test('TC-INV-006: Close investigation', async ({ page }) => {
    await navigateToHSSEEvents(page);
    await page.click('text=Investigation Workspace');
    await page.click('text=Select Incident');
    
    // Complete investigation
    await page.click('button:has-text("Complete Investigation")');
    
    // Fill completion form
    await page.fill('[name="findings_summary"]', 'Investigation completed');
    
    await page.click('button:has-text("Submit")');
    
    await expect(page.locator('text=Investigation completed')).toBeVisible();
  });
});

// ============================================
// NOTIFICATION TESTS
// ============================================

test.describe('Notification System', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('TC-NOT-001: Receive notification on incident creation', async ({ page }) => {
    // Create incident (from another session or directly)
    // Check notifications
    await page.click('button:has-text("Notifications")');
    
    await expect(page.locator('text=New Incident Reported')).toBeVisible();
  });

  test('TC-NOT-002: Mark notification as read', async ({ page }) => {
    await page.click('button:has-text("Notifications")');
    
    // Click on first notification
    await page.click('ul li:first-child');
    
    // Verify marked as read
    await expect(page.locator('text=Marked as read')).toBeVisible();
  });
});

// ============================================
// ROLE-BASED ACCESS TESTS
// ============================================

test.describe('Role-Based Access Control', () => {
  test('TC-RBAC-001: Employee can create incident', async ({ page }) => {
    // Login as employee
    await page.goto(`${BASE_URL}/login`);
    await page.fill('[name="email"]', 'employee@test.com');
    await page.fill('[name="password"]', 'testpassword');
    await page.click('button[type="submit"]');
    
    await navigateToHSSEEvents(page);
    
    // Should see create button
    await expect(page.locator('text=Report Incident')).toBeVisible();
  });

  test('TC-RBAC-002: Employee cannot delete incidents', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('[name="email"]', 'employee@test.com');
    await page.fill('[name="password"]', 'testpassword');
    await page.click('button[type="submit"]');
    
    await navigateToHSSEEvents(page);
    await page.click('table tbody tr:first-child');
    
    // Delete button should not be visible
    await expect(page.locator('button:has-text("Delete")')).not.toBeVisible();
  });

  test('TC-RBAC-003: HSSE Manager can assign investigations', async ({ page }) => {
    await loginAsAdmin(page);
    await navigateToHSSEEvents(page);
    await page.click('text=Investigation Workspace');
    
    // Should see assignment controls
    await expect(page.locator('text=Assign Team')).toBeVisible();
  });
});

// ============================================
// EDGE CASES & FAILURE SCENARIOS
// ============================================

test.describe('Edge Cases & Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('TC-ERR-001: Handle network failure on submit', async ({ page }) => {
    // Block network requests
    await page.route('**/rest/v1/incidents', async (route) => {
      await route.abort('failed');
    });
    
    await navigateToHSSEEvents(page);
    await page.click('text=Report Incident');
    
    await page.fill('[name="title"]', 'Test');
    await page.fill('[name="description"]', 'Test');
    await page.click('button:has-text("Submit")');
    
    // Should show error
    await expect(page.locator('text=Network error')).toBeVisible();
  });

  test('TC-ERR-002: Handle session timeout', async ({ page }) => {
    // Expire session
    await page.addInitScript(() => {
      localStorage.setItem('auth_token', 'expired');
    });
    
    await page.goto(`${BASE_URL}/incidents`);
    
    // Should redirect to login
    await expect(page).toHaveURL(/.*login.*/);
  });

  test('TC-ERR-003: Handle duplicate submission', async ({ page }) => {
    await navigateToHSSEEvents(page);
    await page.click('text=Report Incident');
    
    await page.fill('[name="title"]', 'Duplicate Test');
    await page.fill('[name="description"]', 'Testing duplicate');
    await page.click('button:has-text("Submit")');
    
    // Wait a bit
    await page.waitForTimeout(500);
    
    // Try to submit again
    await page.click('button:has-text("Submit")');
    
    // Should handle duplicate
    await expect(page.locator('text=Duplicate detected')).toBeVisible();
  });

  test('TC-ERR-004: Large file upload rejection', async ({ page }) => {
    await navigateToHSSEEvents(page);
    await page.click('text=Report Incident');
    
    // Try to upload large file
    await page.setInputFiles('[name="attachments"]', 'tests/fixtures/large-file.pdf');
    
    await page.click('button:has-text("Submit")');
    
    // Should show file too large error
    await expect(page.locator('text=File too large')).toBeVisible();
  });

  test('TC-ERR-005: Invalid date handling', async ({ page }) => {
    await navigateToHSSEEvents(page);
    await page.click('text=Report Incident');
    
    await page.fill('[name="title"]', 'Date Test');
    await page.fill('[name="description"]', 'Testing dates');
    await page.fill('[name="occurred_at"]', '2030-01-01'); // Future date
    
    await page.click('button:has-text("Submit")');
    
    // Should validate date
    await expect(page.locator('text=Invalid date')).toBeVisible();
  });
});

// ============================================
// PERFORMANCE TESTS
// ============================================

test.describe('Performance Tests', () => {
  test('TC-PERF-001: Incident list loads under 2 seconds', async ({ page }) => {
    const startTime = Date.now();
    
    await loginAsAdmin(page);
    await navigateToHSSEEvents(page);
    
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(2000);
  });

  test('TC-PERF-002: Search responds quickly', async ({ page }) => {
    await loginAsAdmin(page);
    await navigateToHSSEEvents(page);
    
    const startTime = Date.now();
    
    await page.fill('[name="search"]', 'test');
    await page.press('[name="search"]', 'Enter');
    await page.waitForTimeout(1000);
    
    const searchTime = Date.now() - startTime;
    
    expect(searchTime).toBeLessThan(1000);
  });
});

// ============================================
// OFFLINE MODE TESTS
// ============================================

test.describe('Offline Mode', () => {
  test('TC-OFF-001: Create incident offline', async ({ page }) => {
    // Go offline
    await page.context().setOffline(true);
    
    await loginAsAdmin(page);
    await navigateToHSSEEvents(page);
    await page.click('text=Report Incident');
    
    await page.fill('[name="title"]', 'Offline Test');
    await page.fill('[name="description"]', 'Created offline');
    await page.click('button:has-text("Submit")');
    
    // Should queue for later sync
    await expect(page.locator('text=Queued for sync')).toBeVisible();
    
    // Go back online
    await page.context().setOffline(false);
  });

  test('TC-OFF-002: Sync queued incidents when online', async ({ page }) => {
    // Have queued incidents
    await page.click('text=Sync Status');
    
    // Force sync
    await page.click('button:has-text("Sync Now")');
    
    // Verify sync
    await expect(page.locator('text=Sync complete')).toBeVisible();
  });
});
