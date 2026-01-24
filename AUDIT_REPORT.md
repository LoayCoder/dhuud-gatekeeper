# Comprehensive Security & Architecture Audit Report

## Executive Summary
**Status:** 🟡 **Pending Fixes**

The application demonstrates strong **Tenant Isolation** and **RLS Enforcement** at the database level. Access control via `get_auth_tenant_id()` is consistently applied in migrations, ensuring data security. However, the system is not yet "Production Ready" due to critical gaps in **Type Safety** (widespread use of `any` in hooks) and a potential data-loss vulnerability in the **Offline Sync** mechanism (treating auth errors as permanent failures).

## Verification Checklist

| Area | Status | Notes |
| :--- | :--- | :--- |
| **Tenant Isolation** | ✅ **Secure** | RLS policies consistently use `tenant_id = get_auth_tenant_id()`. No leaks found. |
| **Branch Scoping** | ✅ **Secure** | Branch-level access is enforced via RLS and helper functions. |
| **Incident Hierarchy** | ⚠️ **Gap** | `site_id` and `department_id` are optional in `QuickObservationCard.tsx` (frontend), relying on backend validation or profile defaults. |
| **RLS Policy Leaks** | ✅ **Secure** | No `USING (true)` or bypassed policies found in reviewed migrations. |
| **Offline Safety** | ⚠️ **Risk** | 401/403 errors (Auth/Permission) are treated as **Permanent Failures** in `sw.js`, risking data loss if tokens expire while offline. |
| **Type Safety** | 🔴 **Fail** | Extensive use of `any` in `src/hooks` (e.g., `use-security-report-export.ts`, `use-hsse-alerts.ts`). |

## Gaps Identified & Fixes Required

| Issue | Severity | Location | Remediation Plan |
| :--- | :--- | :--- | :--- |
| **Offline Data Loss Risk** | Critical | `public/sw.js`, `src/lib/offline-mutation-queue.ts` | Change 401/403 handling from "Permanent" to "Retryable" to prevent discarding data upon auth expiry. |
| **Weak Type Safety** | High | `src/hooks/*.ts` | Replace `any` with generated Database types (`Row` types from `src/integrations/supabase/types.ts`). |
| **Weak Hierarchy Validation** | Medium | `src/components/incidents/QuickObservationCard.tsx` | Update Zod schema to make `site_id` and `department_id` required. |

## Technical Implementation Notes

*   **RLS Policies:** The project uses a robust pattern: `USING (tenant_id = get_auth_tenant_id())`.
*   **Offline Queue:** The "Poison Pill" strategy (discarding 400s) is generally good but too aggressive for 401/403 status codes.
*   **Type System:** The `Database` type is available but underutilized in custom hooks.

## Top 3 Critical Issues

1.  **Offline Sync Auth Handling (Critical):**
    *   **Issue:** `public/sw.js` classifies status codes `>= 400 && < 500` as `MUTATION_FAILED_PERMANENT`. This includes `401 Unauthorized` and `403 Forbidden`.
    *   **Impact:** If a user's session expires while they are offline, their queued reports will be **permanently deleted** when they reconnect and the sync fails with 401.
    *   **Fix:** Explicitly exclude 401/403 from the "Permanent Failure" range and treat them as retryable.

2.  **Unsafe "any" Types (High):**
    *   **Issue:** Hooks like `use-hsse-alerts.ts` use `any[]` for critical data (incidents, actions).
    *   **Impact:** Removes TypeScript's ability to catch refactoring bugs or schema mismatches, increasing runtime error risk.
    *   **Fix:** Refactor hooks to import and use `Tables<'incidents'>['Row']` etc.

3.  **Frontend Hierarchy Validation (Medium):**
    *   **Issue:** `QuickObservationCard.tsx` allows `site_id` to be undefined.
    *   **Impact:** Could lead to "orphaned" incidents without proper hierarchy location if the backend default fails or isn't triggered.
    *   **Fix:** Enforce `z.string().min(1)` for `site_id`.

## Final System Status
🟡 **Pending Fixes**
