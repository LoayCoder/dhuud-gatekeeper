# Zero-Trust Database Security Audit Report

**Date:** 2026-02-10
**Auditor:** Jules (AI Senior Database Security Engineer)
**Scope:** Schema (Migrations), RLS Policies, Database Functions, Edge Functions

## Executive Summary
The audit identified **Critical Security Gaps** in the current implementation. While the foundational RLS architecture is present (100% of tables have RLS enabled), several specific policies and functions bypass multi-tenant isolation, allowing potential cross-tenant data leaks or unauthorized modifications.

---

## ✅ Passed Checks
*   **RLS Activation**: 100% of tables (100+ identified) have `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` applied.
*   **`tenants` Table Security**: Public read access (`USING (true)`) is correctly configured for branding, with write operations restricted to Admins/Super Admins.
*   **Legacy Tenant ID Resolution**: The `get_auth_tenant_id()` function is implemented securely (`STABLE`, `SECURITY DEFINER`, checks `auth.uid()`), meeting the "Secure Legacy Pattern" criteria.
*   **Evidence Deletion**: `soft_delete_incident_evidence` correctly enforces tenant isolation.

---

## ⚠️ Warnings (Performance & Integrity)
*   **Performance**: Reliance on `get_auth_tenant_id()` (DB lookup) instead of `auth.jwt()->>'tenant_id'` in RLS policies.
    *   *Impact*: Additional database overhead per query row.
    *   *Recommendation*: Migrate to JWT claims for tenant ID in the future.
*   **Shared Infrastructure**: `ip_geo_cache` allows any authenticated user to update the cache (`USING (true)`).
    *   *Impact*: Potential cache poisoning (integrity risk), though not a direct tenant data leak.

---

## ❌ CRITICAL GAPS (Immediate Action Required)

### 1. RLS Policy Violations (Public/Cross-Tenant Access)

| Table | Issue | Risk |
| :--- | :--- | :--- |
| **`webauthn_challenges`** | `USING (true)` / `WITH CHECK (true)` without `TO service_role`. | **Public Write Access**: Any user (Anon/Auth) can insert, update, or delete authentication challenges. Denial of Service risk. |
| **`asset_categories`** | `FOR SELECT ... USING (true)` for authenticated users. | **Cross-Tenant Data Leak**: Users from Tenant A can view Asset Categories defined by Tenant B (since the table has a `tenant_id` column). |
| **`investigation_sla_configs`** | `Admins can manage... USING (true)`. | **Global Config Tampering**: This appears to be a global table, but "Admins" (Tenant Admins) are allowed to modify it. Tenant Admins should not control platform-wide settings. |
| **`modules`** | `Admins can manage... USING (true)`. | **Global Feature Tampering**: Similar to above, Tenant Admins can modify global module definitions. |

### 2. "Standard Pattern" Failures (Missing Tenant Check)
*The following policies rely solely on `auth.uid()` without explicitly checking `tenant_id`. While `auth.uid()` implicitly isolates users, "Zero-Trust" requires explicit tenant validation.*

*   **`webauthn_credentials`**: `USING (user_id = auth.uid())`. Table has `tenant_id` but it is ignored by the policy.
*   **`user_activity_logs`, `login_history`**: Policies rely only on `user_id`.

### 3. Database Function Vulnerabilities (Security Definer)

*   **`reset_notification_matrix_to_defaults(p_tenant_id uuid)`**
    *   **Vulnerability**: The function is `SECURITY DEFINER` (runs as superuser) but **does not validate** that the caller belongs to `p_tenant_id`.
    *   **Exploit**: Any authenticated user can call this function with *another* tenant's ID to wipe their notification settings.
    *   **Suspected Impact**: Similar patterns likely exist in `seed_default_kpi_targets` and `seed_tenant_badges`.

### 4. Edge Function Service Role Abuse

*   **`rca-ai-assistant`**
    *   **Vulnerability**: Accepts `incident_id` in payload and uses `SUPABASE_SERVICE_ROLE_KEY` to fetch data. **No verification** that the caller has access to the incident.
    *   **Exploit**: A user from Tenant A can request AI analysis for an incident in Tenant B, exposing sensitive investigation data.
*   **`delete-auth-user`**
    *   **Vulnerability**: Accepts `user_id` and deletes the account using Service Role. No check if the caller is an authorized Admin for that user's tenant.
    *   **Exploit**: Privilege Escalation / Destructive Action.

---

## Recommendations
1.  **Patch `webauthn_challenges`**: Add `TO service_role` to the policy immediately.
2.  **Fix RLS Policies**: Add `AND tenant_id = get_auth_tenant_id()` to all policies flagged above (Asset Categories, etc.).
3.  **Secure DB Functions**: Add `IF p_tenant_id != get_auth_tenant_id() THEN RAISE EXCEPTION ...` to `reset_notification_matrix_to_defaults` and similar seed functions.
4.  **Secure Edge Functions**:
    *   Switch to `createClient` using the User's JWT (standard RLS) instead of Service Role where possible.
    *   OR, manually validate `incident.tenant_id` matches `user.tenant_id` before processing.
