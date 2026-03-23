

# RLS & Tenant Isolation System-Wide Audit

## Integration Health Status: ❌ Critical Risk — 10 broken policies + 2 broken functions + 8 duplicate policies

---

## Findings Table

| # | Table / Function | Policy Name | Issue | Severity | Status |
|---|-----------------|-------------|-------|----------|--------|
| 1 | `asset_inspection_part_results` | "Users can view/insert/update/delete part results for their tenant" (x4) | Old `app_metadata` policies NOT dropped — duplicate alongside fixed policies | **High** | Stale duplicates |
| 2 | `asset_type_parts` | "Users can view/insert/update/delete parts for their tenant" (x4) | Same — old broken policies coexist with fixed ones | **High** | Stale duplicates |
| 3 | `contractor_violation_summary` | "Tenant isolation for contractor_violation_summary" | ONLY policy — uses `app_metadata`. ALL operations silently blocked | **Critical** | No working policy |
| 4 | `system_alerts` | "Tenant isolation for system_alerts" | ONLY policy — uses `app_metadata`. ALL operations silently blocked | **Critical** | No working policy |
| 5 | `visitor_access_rules` | "tenant_isolation_visitor_access_rules" | ONLY policy — uses `app_metadata`. ALL operations silently blocked | **Critical** | No working policy |
| 6 | `visitor_approvals` | "tenant_isolation_visitor_approvals" | ONLY policy — uses `app_metadata`. ALL operations silently blocked | **Critical** | No working policy |
| 7 | `visitor_audit_log` | "tenant_isolation_visitor_audit" | ONLY policy (SELECT) — uses `app_metadata`. Reads silently return empty | **Critical** | No working policy |
| 8 | `visitor_inductions` | "tenant_isolation_visitor_inductions" | ONLY policy — uses `app_metadata`. ALL operations silently blocked | **Critical** | No working policy |
| 9 | `get_hsse_dashboard_summary` | DB Function | Uses `app_metadata` with NO fallback — always throws "No tenant_id in JWT" | **Critical** | Function broken |
| 10 | `get_incident_people_metrics` | DB Function | Uses `app_metadata` but HAS fallback to profiles table | **Low** | Works via fallback |

---

## Root Cause Analysis

All broken items share the same root cause: policies/functions were written using `auth.jwt() -> 'app_metadata' ->> 'tenant_id'` but **no users have `tenant_id` in their JWT app_metadata**. The system uses the `profiles` table as the source of truth for tenant assignment.

The previous migration (March 23) fixed `asset_inspection_part_results` and `asset_type_parts` by creating NEW policies but **failed to drop the OLD broken policies**, leaving 8 duplicate policies that could cause confusing behavior.

---

## Fix Plan — Single Database Migration

### Part 1: Drop 8 stale duplicate policies (from previous incomplete fix)
Drop the old `app_metadata`-based policies on `asset_inspection_part_results` and `asset_type_parts` that were not cleaned up.

### Part 2: Fix 6 tables with ONLY broken policies
Replace `app_metadata` policies on these tables with the profiles-based pattern:

**Tables to fix:**
- `contractor_violation_summary` — replace ALL policy
- `system_alerts` — replace ALL policy
- `visitor_access_rules` — replace ALL policy
- `visitor_approvals` — replace ALL policy
- `visitor_audit_log` — replace SELECT policy (add INSERT for logging)
- `visitor_inductions` — replace ALL policy

**Standard replacement pattern:**
```sql
USING (tenant_id IN (
  SELECT tenant_id FROM public.profiles
  WHERE id = auth.uid() AND deleted_at IS NULL
))
```

### Part 3: Fix `get_hsse_dashboard_summary` function
Add fallback to profiles table (same pattern as `get_incident_people_metrics` which already works):
```sql
v_tenant_id := (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid;
IF v_tenant_id IS NULL THEN
  SELECT tenant_id INTO v_tenant_id FROM profiles WHERE id = auth.uid();
END IF;
```

### Part 4: No code changes needed
All frontend hooks already use profiles-based tenant ID. The fix is entirely database-side.

---

## Files to Modify
- **One new database migration** — drops 8 stale policies, replaces 6 broken policies, fixes 1 broken function

