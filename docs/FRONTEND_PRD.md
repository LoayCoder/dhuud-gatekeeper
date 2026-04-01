# Frontend Product Requirements Document (PRD)
# Dhuud Gatekeeper — HSSE Management Platform

**Version:** 1.0  
**Date:** 2026-03-14  
**Author:** AI-Generated  
**Status:** Draft

---

## 1. Product Overview

### 1.1 Purpose
Dhuud Gatekeeper is a comprehensive HSSE (Health, Safety, Security, Environment) management platform designed for multi-tenant organizations. It provides gate pass management, incident reporting, asset tracking, inspections, and offline-capable field operations.

### 1.2 Target Users
- **Primary:** Arabic-speaking HSSE professionals (managers, officers, inspectors)
- **Secondary:** English-speaking users, contractors, visitors, and security personnel

### 1.3 Supported Platforms
- Web (Desktop & Mobile browsers)
- Progressive Web App (PWA) with offline support
- Despia native hybrid app (iOS & Android)

---

## 2. Authentication & Access Control

### 2.1 Authentication Flow

```
User arrives → /login
    ↓
Enter email + password
    ↓
Supabase Auth validates credentials
    ↓
[MFA Check]
    │
    ├── MFA enrolled & verified → /dashboard ✅
    │
    ├── MFA NOT enrolled → /mfa-setup
    │       │
    │       ├── User sets up TOTP → /dashboard ✅
    │       │
    │       └── User clicks "Skip for now" → 24h grace period → /dashboard ✅
    │
    └── MFA disabled (was enrolled) → grace period active → /dashboard ✅
                                    → grace expired → /mfa-setup
```

### 2.2 Two-Factor Authentication (2FA / MFA)

#### 2.2.1 MFA Enrollment
- **Method:** TOTP (Time-based One-Time Password) via authenticator apps (Google Authenticator, Microsoft Authenticator, etc.)
- **QR Code:** Displayed during enrollment for scanning
- **Verification:** User must enter a valid 6-digit code to confirm enrollment
- **Backup Codes:** Generated after successful enrollment for account recovery

#### 2.2.2 MFA Grace Period (Skip 2FA)
The platform supports a **24-hour grace period** allowing users to temporarily bypass MFA setup.

**Trigger Points:**
1. **MFA Setup Page (`/mfa-setup`):** A "Skip for now" button allows users to defer MFA setup for 24 hours
2. **MFA Disable (Profile Settings):** After disabling MFA from profile, a 24-hour window prevents immediate re-enrollment redirect

**Technical Implementation:**
- `mfa_grace_until` column in `tenant_user_mfa_status` table stores the grace expiry timestamp
- `AuthContext` exposes `mfaGraceActive` boolean (computed: `mfaGraceUntil && new Date() < mfaGraceUntil`)
- `ProtectedRoute` skips MFA redirect when `mfaGraceActive === true`

**Grace Period Flow:**
```
User on /mfa-setup → clicks "Skip for now"
    ↓
DB: mfa_grace_until = NOW() + 24 hours
    ↓
AuthContext refreshes → mfaGraceActive = true
    ↓
Navigate to / (dashboard)
    ↓
ProtectedRoute allows access (grace active)
    ↓
After 24 hours → mfaGraceActive = false → redirect to /mfa-setup
```

#### 2.2.3 MFA Disable Flow
```
User in Profile → Security Settings → Disable 2FA
    ↓
MFA Disable Dialog opens
    ↓
User enters current TOTP code (6-digit)
    ↓
System verifies code → unenrolls factor
    ↓
Sets 24-hour grace period
    ↓
User continues using app normally
    ↓
After 24h → redirected to /mfa-setup to re-enroll
```

### 2.3 Login for AI / Automated Testing (Bypassing 2FA)

To enable AI agents or automated testing to log into the system without 2FA friction:

#### Method 1: Use the Grace Period (Recommended for Testing)
1. Log in with email + password via `/login`
2. On the `/mfa-setup` page, click **"Skip for now"** (or trigger programmatically)
3. The system sets a 24-hour grace window
4. AI/automated agent can access all protected routes for 24 hours
5. Repeat the skip action every 24 hours if continuous access is needed

#### Method 2: Database-Level Grace Override (Admin/Dev Only)
For persistent AI access in development/staging:
```sql
-- Set a long grace period for a specific user in a tenant
UPDATE public.tenant_user_mfa_status
SET mfa_grace_until = NOW() + INTERVAL '365 days',
    requires_setup = true,
    updated_at = NOW()
WHERE user_id = '<USER_UUID>'
  AND tenant_id = '<TENANT_UUID>';
```

#### Method 3: Disable Tenant MFA Requirement (Admin Only)
```sql
-- Disable MFA requirement for the entire tenant (not recommended for production)
UPDATE public.tenant_settings
SET mfa_required = false
WHERE tenant_id = '<TENANT_UUID>';
```

> ⚠️ **Security Warning:** Methods 2 and 3 should ONLY be used in development/staging environments. Never disable MFA in production.

### 2.4 Role-Based Access Control (RBAC)

| Role | Access Level |
|------|-------------|
| `super_admin` | System-wide, all tenants |
| `tenant_admin` | Full tenant access |
| `hsse_manager` | HSSE module management |
| `hsse_officer` | HSSE operations |
| `security_manager` | Security module management |
| `security_officer` | Gate/patrol operations |
| `contractor_manager` | Contractor oversight |
| `department_head` | Department approvals |
| `employee` | Basic access |
| `visitor` | Limited temporary access |
| `contractor_worker` | Contractor field access |

---

## 3. Core Modules

### 3.1 Dashboard (`/dashboard`)
- KPI cards (incidents, inspections, compliance rates)
- Recent activity feed
- Quick action buttons based on user role
- Charts and trend visualizations

### 3.2 Incident Management (`/incidents`)
- Report new incidents with photos, GPS, severity classification
- Multi-step investigation workflow
- Corrective action tracking with SLA monitoring
- Escalation engine with configurable rules

### 3.3 Inspections (`/inspections`)
- Template-based area inspections
- Offline-capable inspection sessions
- Photo capture with GPS tagging
- Finding classification (observation, non-conformity, critical)
- Corrective action generation from findings

### 3.4 Asset Management (`/assets`)
- Asset registry with categories, types, subtypes
- Maintenance scheduling and tracking
- Health scoring and failure predictions
- Cost tracking (TCO) and depreciation
- Document management (certificates, warranties)

### 3.5 Contractor Management (`/contractors`)
- Company registration and compliance tracking
- Worker profiles with document verification
- Gate pass issuance and management
- Safety performance scoring

### 3.6 Security Operations (`/security`)
- Shift management
- Patrol sessions with checkpoint tracking
- Visitor management
- Access control monitoring

### 3.7 Permits (`/permits`)
- Work permit workflows
- Multi-level approval chains
- Expiry tracking and renewal

---

## 4. Technical Requirements

### 4.1 Technology Stack
| Layer | Technology |
|-------|-----------|
| Framework | React 18+ (Vite) |
| Language | TypeScript 5.x |
| Styling | Tailwind CSS + Shadcn UI |
| State | React Query (TanStack) + Context API |
| Backend | Supabase (Lovable Cloud) |
| Auth | Supabase Auth + TOTP MFA |
| Offline | Service Workers (PWA) + IndexedDB |
| i18n | react-i18next (AR primary, EN secondary) |
| Animation | Framer Motion |

### 4.2 Internationalization (i18n)
- **Primary language:** Arabic (RTL)
- **Secondary language:** English (LTR)
- All UI text must use translation keys (`t('key')`)
- CSS Logical Properties mandatory (no `ml-`, `mr-`, `pl-`, `pr-`)
- Bilingual data fields: `name` (EN) + `name_ar` (AR)

### 4.3 Offline Capabilities
- Critical features work without internet (inspections, incidents)
- Mutations queued in IndexedDB via `offline-mutation-queue`
- Auto-sync when connectivity restored
- Cached session for offline authentication
- Visual indicators for offline/pending states

### 4.4 Multi-Tenancy
- All data isolated by `tenant_id`
- Row Level Security (RLS) on all tables
- Branch-aware permissions for multi-site tenants
- Tenant-specific settings and configurations

### 4.5 Security Requirements
- MFA (TOTP) with configurable enforcement
- Session validation via edge functions
- Soft deletes only (audit trail preservation)
- PII minimization (no `SELECT *`)
- Role-based UI rendering (action cards gated by RPC)
- Trusted device management
- Activity logging for all critical operations

---

## 5. UI/UX Requirements

### 5.1 Design Principles
- Mobile-first responsive design
- HSSE color standards (Red=Danger, Yellow=Warning, Blue=Mandatory, Green=Safe)
- High contrast for field conditions
- Touch-friendly targets (min 44px)
- Accessible (WCAG 2.1 AA)

### 5.2 Responsive Breakpoints
| Breakpoint | Target |
|-----------|--------|
| < 640px | Mobile phones |
| 640-1024px | Tablets (field inspectors) |
| > 1024px | Desktop (managers, admins) |

### 5.3 RTL Support
- `dir="rtl"` on HTML root for Arabic
- CSS Logical Properties throughout
- Icon flipping (`rtl:rotate-180` for directional icons)
- Portal/Dialog `dir` prop awareness
- Arabic fonts: IBM Plex Sans Arabic / Cairo

---

## 6. Performance Requirements

| Metric | Target |
|--------|--------|
| First Contentful Paint | < 1.5s |
| Time to Interactive | < 3s |
| Lighthouse Score | > 85 |
| Offline Load | < 2s (cached) |
| API Response Time | < 500ms (p95) |

---

## 7. Testing Strategy

### 7.1 Unit Tests
- Vitest for component and hook testing
- Coverage target: > 70% for critical paths

### 7.2 Integration Tests
- Workflow transitions
- Permission checks
- Offline queue sync

### 7.3 E2E Testing (AI/Automated)
- Use grace period method to bypass MFA (see Section 2.3)
- Browser automation via Playwright
- Test critical user journeys per role

---

## 8. Deployment

| Environment | URL | MFA Policy |
|------------|-----|-----------|
| Preview | `id-preview--*.lovable.app` | Grace period available |
| Staging | `staging.dhuud-guard-station.lovable.app` | Grace period available |
| Production | `dhuud-guard-station.lovable.app` | Enforced (no long-term skip) |

---

## 9. Appendix

### 9.1 Key File Locations
| Purpose | Path |
|---------|------|
| Auth Context | `src/contexts/AuthContext.tsx` |
| Protected Route | `src/components/auth/ProtectedRoute.tsx` |
| MFA Setup | `src/pages/MFASetup.tsx` |
| MFA Disable | `src/components/profile/MFADisableDialog.tsx` |
| Offline Queue | `src/lib/offline-mutation-queue.ts` |
| Workflow Engine | `src/lib/workflow-status-resolver.ts` |
| Route Registry | `src/config/route-registry-types.ts` |

### 9.2 Database Tables (Auth-Related)
| Table | Purpose |
|-------|---------|
| `profiles` | User profile data |
| `tenant_user_mfa_status` | MFA enforcement & grace period |
| `user_roles` | RBAC role assignments |
| `tenant_settings` | Tenant-level configuration |
| `trusted_devices` | Device trust management |
