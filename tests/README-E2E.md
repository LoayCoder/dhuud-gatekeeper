# E2E Tests Suite - Dhuud Gatekeeper (mainv1_offlinemood)

## 📋 Overview

This is a comprehensive E2E test suite for the HSSE Events Module in Dhuud Gatekeeper.

### Test Users

| # | Email | Password | Role | Tests |
|---|-------|----------|------|-------|
| 1 | `luay.dhuud.com` | `12345678` | HSSE Manager / Admin | All features |
| 2 | `Loay.smartphoto@gmail.com` | `1410Loay1410` | Investigator / Expert | Investigation, Create |
| 3 | `1st.arabcoder@gmail.com` | `1410Loay1410` | Employee / Contractor | Create, View Own |

---

## 🚀 Quick Start

### 1. Clone and Setup
```bash
git clone https://github.com/LoayCoder/dhuud-gatekeeper.git
cd dhuud-gatekeeper
git checkout mainv1_offlinemood
npm install --legacy-peer-deps
npx playwright install --with-deps
```

### 2. Configure Environment
```bash
# Set your app URL
export E2E_BASE_URL=https://your-app-url.supabase.co
# or
export E2E_BASE_URL=http://localhost:5173
```

### 3. Run Tests

```bash
# Run all tests
npx playwright test -c playwright.e2e.config.ts

# Run specific test suite
npx playwright test -c playwright.e2e.config.ts --grep "Login"

# Run with UI
npx playwright test -c playwright.e2e.config.ts --ui

# Generate HTML report
npx playwright show-report
```

---

## 📊 Test Coverage

### 10 Test Suites | 35+ Test Cases

| Suite | Tests | Description |
|-------|-------|-------------|
| **1. Login Tests** | 4 | Verify login for all 3 users + invalid credentials |
| **2. Incident Creation** | 4 | Create incidents with/without injuries/damage |
| **3. Observation Tests** | 3 | Create observations, escalate to incident |
| **4. Investigation** | 6 | Full investigation workflow |
| **5. Role-Based Access** | 3 | Verify permissions per role |
| **6. Notifications** | 2 | Notification handling |
| **7. Edge Cases** | 4 | Network failure, timeout, duplicates |
| **8. Offline Mode** | 2 | Offline creation and sync |
| **9. Dashboard & Reports** | 3 | Dashboard, statistics, export |
| **10. Regression** | 2 | Full workflow, multi-user |

---

## 📁 File Structure

```
tests/
├── hsse-complete.spec.ts      # Main test file (35+ tests)
├── global-setup.ts            # Authentication setup
├── global-teardown.ts         # Cleanup
├── fixtures/
│   └── test-data.ts           # Test data (already in main file)
└── .auth/                     # Generated auth states
    ├── user1.json
    ├── user2.json
    └── user3.json
```

---

## ⚙️ Configuration

### playwright.e2e.config.ts
- Base URL: Configurable via `E2E_BASE_URL`
- Browser: Chromium (primary)
- Timeout: 60 seconds per test
- Retries: 1 locally, 2 on CI

---

## 🎯 Running Specific Tests

```bash
# Login tests only
npx playwright test -c playwright.e2e.config.ts --grep "Login"

# Investigation tests only
npx playwright test -c playwright.e2e.config.ts --grep "Investigation"

# Role-based tests only
npx playwright test -c playwright.e2e.config.ts --grep "RBAC"

# Single test
npx playwright test -c playwright.e2e.config.ts --grep "TC-LOG-001"
```

---

## 📈 Expected Results

### Passing Criteria
- ✅ All HIGH priority tests pass
- ✅ 90%+ MEDIUM priority pass
- ✅ No security vulnerabilities
- ✅ Performance targets met

### Sample Output
```
Running 35 tests using 2 workers

  ✓ TC-LOG-001: Login with User 1 (HSSE Manager) (2.5s)
  ✓ TC-LOG-002: Login with User 2 (Investigator) (2.3s)
  ✓ TC-LOG-003: Login with User 3 (Employee) (2.1s)
  ✓ TC-INC-001: Create basic incident (3.2s)
  ...
  35 passed, 0 failed (45s)
```

---

## 🔧 Troubleshooting

### Login Issues
- Verify credentials are correct
- Check Supabase auth is enabled
- Ensure app URL is accessible

### Network Issues
- Check `E2E_BASE_URL` is set correctly
- Verify Supabase project is running
- Check firewall settings

### Timeout Issues
- Increase timeout in config: `timeout: 120000`
- Check app performance
- Verify database connections

---

## 📝 Adding New Tests

1. Add test to `hsse-complete.spec.ts`
2. Follow naming: `TC-[MODULE]-[NUMBER]: Test Name`
3. Use `TEST_USERS` and `TEST_DATA` helpers
4. Update this README

---

## 📞 Support

For issues or questions:
- Check the main audit report: `HSSE-Audit-Report-Branch-Mainv1-OfflineMood.md`
- Check execution plan: `HSSE-Optimized-Execution-Plan.md`

---

*Generated: April 1, 2026*  
*Branch: mainv1_offlinemood*