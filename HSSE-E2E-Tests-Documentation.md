# E2E Tests Suite - HSSE Events Module
## Branch: mainv1_offlinemood | Generated: April 1, 2026

---

## 📋 Overview

| Item | Value |
|------|-------|
| **Total Test Cases** | 35+ |
| **Test File** | `tests/hsse-incident-workflow.spec.ts` |
| **Config** | `playwright.config.ts` |
| **Browsers** | Chrome, Firefox, Safari, Mobile |
| **Estimated Runtime** | ~45-60 minutes |

---

## 🧪 Test Coverage

### 1. Incident Creation (4 tests)
| ID | Test Case | Priority |
|----|-----------|----------|
| TC-IN-001 | Create new incident as Employee | HIGH |
| TC-IN-002 | Validate required fields | HIGH |
| TC-IN-003 | Create incident with injury | MEDIUM |
| TC-IN-004 | Create incident with property damage | MEDIUM |

### 2. Incident List & Filters (3 tests)
| ID | Test Case | Priority |
|----|-----------|----------|
| TC-IN-005 | View incident list | HIGH |
| TC-IN-006 | Filter by status | MEDIUM |
| TC-IN-007 | Search incidents | MEDIUM |

### 3. Incident Detail View (2 tests)
| ID | Test Case | Priority |
|----|-----------|----------|
| TC-IN-008 | View incident details | HIGH |
| TC-IN-009 | Add comment to incident | MEDIUM |

### 4. Observation Workflow (2 tests)
| ID | Test Case | Priority |
|----|-----------|----------|
| TC-OB-001 | Create observation | HIGH |
| TC-OB-002 | Escalate observation to incident | HIGH |

### 5. Investigation Workflow (6 tests)
| ID | Test Case | Priority |
|----|-----------|----------|
| TC-INV-001 | Start investigation | HIGH |
| TC-INV-002 | Assign investigation team | HIGH |
| TC-INV-003 | Add evidence | HIGH |
| TC-INV-004 | Complete Five Whys analysis | HIGH |
| TC-INV-005 | Add corrective actions | HIGH |
| TC-INV-006 | Close investigation | HIGH |

### 6. Notification System (2 tests)
| ID | Test Case | Priority |
|----|-----------|----------|
| TC-NOT-001 | Receive notification on incident creation | MEDIUM |
| TC-NOT-002 | Mark notification as read | LOW |

### 7. Role-Based Access Control (3 tests)
| ID | Test Case | Priority |
|----|-----------|----------|
| TC-RBAC-001 | Employee can create incident | HIGH |
| TC-RBAC-002 | Employee cannot delete incidents | HIGH |
| TC-RBAC-003 | HSSE Manager can assign investigations | HIGH |

### 8. Edge Cases & Error Handling (5 tests)
| ID | Test Case | Priority |
|----|-----------|----------|
| TC-ERR-001 | Handle network failure on submit | HIGH |
| TC-ERR-002 | Handle session timeout | HIGH |
| TC-ERR-003 | Handle duplicate submission | MEDIUM |
| TC-ERR-004 | Large file upload rejection | MEDIUM |
| TC-ERR-005 | Invalid date handling | LOW |

### 9. Performance Tests (2 tests)
| ID | Test Case | Priority |
|----|-----------|----------|
| TC-PERF-001 | Incident list loads under 2 seconds | MEDIUM |
| TC-PERF-002 | Search responds quickly | MEDIUM |

### 10. Offline Mode (2 tests)
| ID | Test Case | Priority |
|----|-----------|----------|
| TC-OFF-001 | Create incident offline | HIGH |
| TC-OFF-002 | Sync queued incidents when online | HIGH |

---

## 🚀 Running the Tests

### Prerequisites
```bash
# Install dependencies (already done)
npm install --legacy-peer-deps

# Install Playwright browsers
npx playwright install --with-deps
```

### Run All Tests
```bash
# All browsers
npx playwright test

# Single browser
npx playwright test --project=chromium
```

### Run Specific Test Groups
```bash
# Incident creation only
npx playwright test --grep="Incident Creation"

# Investigation workflow
npx playwright test --grep="Investigation"

# Error handling
npx playwright test --grep="Error Handling"
```

### Run with UI
```bash
npx playwright test --ui
```

### Generate Report
```bash
# HTML Report
npx playwright show-report

# JSON Report (for CI)
npx playwright test --reporter=json
```

---

## ⚙️ Configuration

### Environment Variables
```bash
# Base URL (default: http://localhost:5173)
export E2E_BASE_URL=http://your-app-url

# Admin credentials
export E2E_ADMIN_EMAIL=admin@test.com
export E2E_ADMIN_PASSWORD=your-password
```

### Config Options (playwright.config.ts)
- `testDir`: Test file location
- `timeout`: 30 seconds per test
- `retries`: 2 on CI, 0 locally
- `projects`: Chrome, Firefox, Safari, Mobile

---

## 📊 Expected Results

### Success Criteria
- ✅ All HIGH priority tests pass
- ✅ 90%+ of MEDIUM priority tests pass
- ✅ 80%+ of LOW priority tests pass
- ✅ No security vulnerabilities detected
- ✅ Performance targets met

### Test Output
```
Tests:       35 passed, 0 failed
Duration:    ~45 minutes
Browsers:   5 projects
```

---

## 🔧 Maintenance

### Adding New Tests
1. Add test to `tests/hsse-incident-workflow.spec.ts`
2. Follow naming convention: `TC-[MODULE]-[NUMBER]: Test Name`
3. Add to appropriate test.describe block
4. Update this document

### Updating Selectors
If UI changes, update selectors in test file:
- Use `data-testid` attributes where possible
- Fallback to semantic selectors
- Avoid brittle CSS selectors

---

## 📝 Notes

- Tests use real database (not mocked)
- Each test cleans up after itself
- Parallel execution enabled
- Screenshots captured on failure
- Videos recorded on failure

---

*Document Generated: April 1, 2026*  
*For: Dhuud Gatekeeper - HSSE Events Module*