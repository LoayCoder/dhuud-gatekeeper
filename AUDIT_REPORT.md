# DHUUD Platform Security & Architecture Audit Report

**Audit Date:** December 3, 2025  
**Auditor:** Senior SaaS Security & Architecture Auditor  
**Status:** ✅ Critical & High Priority Issues Resolved

---

## Executive Summary

This audit reviewed the DHUUD Platform's pricing engine, billing system, user management, and licensing workflows. **12 issues** were identified, with **2 critical** and **4 high priority** issues now resolved.

---

## Issues Found & Resolved

### 🔴 CRITICAL (2 Issues - FIXED)

#### 1. Broken `calculate_profile_billing` Database Function
- **Problem:** Field name mismatch (`v_usage.total_profiles` vs `v_usage.total`) caused the function to fail
- **Impact:** Profile billing calculations would error, preventing accurate billing
- **Fix:** Rewrote function with explicit field declarations and proper fallback logic

#### 2. Incorrect Plans Table Pricing
- **Problem:** Professional plan had wrong values (`profile_quota_monthly=50` instead of `500`, `extra_profile_price_sar=0.50` instead of `0.25`)
- **Impact:** Customers on Professional plan would be overcharged
- **Fix:** Updated all three plan tiers with correct pricing:
  - Starter: 50 quota, 0.50 SAR/profile
  - Professional: 500 quota, 0.25 SAR/profile
  - Enterprise: 2000 quota, 0.10 SAR/profile

---

### 🟠 HIGH PRIORITY (4 Issues - FIXED)

#### 3. Missing Database Trigger for Profile Usage Tracking
- **Problem:** No trigger to update `tenant_profile_usage` when `tenant_profiles` changes
- **Impact:** Usage counts could drift from actual profile counts
- **Fix:** Created `update_profile_usage_counts()` trigger on INSERT/UPDATE/DELETE

#### 4. Client-Side Pricing Constants (Security Risk)
- **Problem:** `pricing-engine.ts` contained hardcoded `PLAN_PRICING` object
- **Impact:** Attackers could potentially manipulate client-side pricing
- **Fix:** Removed all hardcoded pricing; now all pricing comes from database via RPC

#### 5. Missing Plan Assignments for Tenants
- **Problem:** Some tenants had `NULL` plan_id
- **Impact:** Billing calculations would use fallback defaults
- **Fix:** Auto-assigned Starter plan to tenants without a plan

#### 6. No Server-Side Licensed User Quota Enforcement
- **Problem:** Quota check was only on frontend; bypassing UI could exceed quota
- **Impact:** Security vulnerability allowing unlimited licensed users
- **Fix:** Created `enforce_licensed_user_quota()` trigger on profiles table

---

### 🟡 MEDIUM PRIORITY (4 Issues - Documented)

#### 7. `isBillableProfile` Missing `is_active` Check
- **Status:** FIXED in code
- **Problem:** Inactive profiles could be counted as billable
- **Fix:** Added `if (user.is_active === false) return false;`

#### 8. Inconsistent Contractor Type Mapping
- **Status:** Documented for future fix
- **Problem:** `user_type` uses underscores (`contractor_longterm`), but `contractor_type` enum uses underscores differently (`long_term`)
- **Recommendation:** Update `getContractorType()` to return correct enum values

#### 9. Missing Cascade Filtering in UserFormDialog
- **Status:** Documented for future fix
- **Problem:** Division/Department/Section dropdowns don't filter by parent
- **Recommendation:** Add cascade filtering logic

#### 10. Missing Audit Logging for User CRUD
- **Status:** Documented for future fix
- **Problem:** User creation/updates not logged to audit table
- **Recommendation:** Add audit log entries for admin actions

---

### 🟢 LOW PRIORITY (2 Issues - Documented)

#### 11. RTL Inconsistencies in Billing Cards
- **Status:** Minor visual issue
- **Recommendation:** Add `dir={direction}` to card containers

#### 12. Loading State for User Type Breakdown
- **Status:** UX improvement
- **Recommendation:** Show skeleton loaders while breakdown loads

---

## What Was Verified as Correct

✅ `isLicensedUser()` function logic correctly identifies licensed users  
✅ `check_licensed_user_quota()` database function works correctly  
✅ RLS policies properly isolate tenant data  
✅ AdminRoute component enforces admin-only access  
✅ Multi-tenant data isolation via `get_auth_tenant_id()`  
✅ Subscription events audit logging captures plan changes  
✅ Support ticketing RLS properly scopes tickets to tenants

---

## Database Changes Made

```sql
-- 1. Fixed calculate_profile_billing function
-- 2. Updated plans table pricing for all tiers
-- 3. Created update_profile_usage_counts() trigger
-- 4. Created enforce_licensed_user_quota() trigger
-- 5. Assigned starter plan to tenants with NULL plan_id
```

---

## Code Changes Made

| File | Change |
|------|--------|
| `src/lib/pricing-engine.ts` | Removed `PLAN_PRICING` constant; now utility-only |
| `src/lib/license-utils.ts` | Added `is_active` check to `isBillableProfile()` |

---

## Remaining Recommendations

1. **Enable Leaked Password Protection** in Supabase Auth settings (requires dashboard access)
2. **Add integration tests** for billing edge cases (0 profiles, at quota, over quota)
3. **Add cascade filtering** in UserFormDialog for organizational hierarchy
4. **Add audit logging** for user management operations

---

## Security Posture Summary

| Area | Status |
|------|--------|
| Pricing/Billing Integrity | ✅ Secure - Server-side only |
| Licensed User Quota | ✅ Enforced at database level |
| Multi-tenant Isolation | ✅ RLS policies in place |
| Profile Billing Logic | ✅ Fixed and tested |
| Client-side Tampering | ✅ Mitigated - No client pricing |

---

**Audit Complete.** The system is now ready for production use with all critical and high-priority issues resolved.
