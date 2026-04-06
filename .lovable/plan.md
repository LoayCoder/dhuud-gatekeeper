

# Gate Pass System Audit Report — Findings & Fixes

## Audit Summary

After querying all 11 gate passes, related tables, RLS policies, indexes, and audit logs, here are the findings organized by severity.

---

## RED — Critical Issues (5)

### 1. Zero Audit Trail for Gate Passes
The `contractor_module_audit_logs` table has **zero entries** for `entity_type = 'material_gate_pass'`. The `security_audit_logs` also has **zero entries** for `action_category = 'gate_control'`. Every creation, approval, and rejection happened with **no audit record**. The `contractor-audit-log` edge function is either not being called or silently failing.

**Fix:** Debug the edge function invocation in the creation/approval code paths. Add fallback direct-insert audit logging if the edge function fails. Backfill audit records from existing timestamp data.

### 2. All 11 Passes Have NULL `submitted_at`
Every single gate pass (11/11) has `submitted_at = NULL`. This means either the submission timestamp is never being set, or the concept of "submit" is conflated with "create." This breaks any time-tracking or SLA measurement.

**Fix:** Set `submitted_at = NOW()` during creation (for public passes) or when the pass transitions from draft to first pending status.

### 3. All 11 Passes Have NULL `project_id` and `company_id`
Every gate pass has both foreign keys set to NULL, including the 5 internal/contractor passes that should have them. This breaks:
- Company-based RLS isolation (contractor reps see nothing via the FK-based policy)
- Project filtering and reporting
- The project requirement gate is bypassed

**Fix:** The creation form or RPC must enforce setting `company_id` for external requests and optionally for internal. Backfill existing data where possible.

### 4. Duplicate Reference Number: GP-2026-00001
Two different gate passes share reference `GP-2026-00001`. The `nextval_gate_pass_ref` sequence or its usage has a bug — likely the sequence was reset or two tenants share the same sequence without tenant scoping.

**Fix:** Add a unique constraint on `(tenant_id, reference_number)` and investigate the sequence function.

### 5. 111 Orphaned Gate Entry Logs (0 linked to passes)
All 111 `gate_entry_logs` rows have `material_gate_pass_id = NULL`. None are linked to any gate pass. These are from visitor/worker/delivery entries unrelated to the material gate pass workflow, but they share the same table — creating confusion and potential data integrity issues.

**Fix:** Either separate visitor/worker entry logs into a dedicated table, or ensure material gate pass entries always set the FK. 34 of these have no exit time recorded for 24+ hours (stale entries).

---

## ORANGE — High Issues (2)

### 6. 5 Expired Passes Still in Pending Status
Five gate passes have `end_date` in the past but remain in pending statuses:
- GP-2026-00001: expired 2026-01-11, still `pending_club_mgmt_ack`
- GP-2026-00003: expired 2026-02-02, still `pending_dept_approval`
- PUB-20260210-3fb1c78f: expired 2026-02-12, still `pending_security_approval`
- PUB-20260210-62c1e933: expired 2026-02-11, still `pending_security_approval`
- PUB-20260216-596fdd68: expired 2026-02-19, still `pending_security_approval`

**Fix:** Add a cron job or scheduled function to auto-expire passes past their end date. Add visual "expired" badge in the UI for passes past their date range.

### 7. No Branch-Level Filtering in Contractor Rep RLS
The contractor rep RLS policy (`Contractor reps can manage own gate passes`) checks `company_id` match via `contractor_representatives`, but since all `company_id` values are NULL, this policy effectively grants contractor reps **zero access** to any passes. This is a silent failure — no error shown, just empty results.

**Fix:** Ensure `company_id` is always set on creation. The RLS policy itself is correctly designed but has no data to work with.

---

## GREEN — Working Correctly

| Check | Result |
|-------|--------|
| Approved passes have QR tokens | 3/3 approved passes have `qr_code_token` |
| Approved passes have security approver | 3/3 have `security_approved_by` set |
| Approved passes have club mgmt ack | 3/3 have `club_mgmt_ack_by` set |
| Rejected passes have rejector + reason | 3/3 rejected passes have both fields |
| Public passes have access tokens | 6/6 public passes have `public_access_token` |
| No date inversion (end < start) | 0 violations |
| Gate pass items FK integrity | 6/6 items correctly linked |
| RLS policies comprehensive | 9 policies covering all roles |
| Indexes optimized | 14 indexes covering status, tenant, company, date, QR, branch |
| Soft delete pattern | All queries filter `deleted_at IS NULL` |
| Multi-tenant isolation | All RLS policies use `get_auth_tenant_id()` |

---

## Recommended Fix Plan (Priority Order)

| Priority | Fix | Effort |
|----------|-----|--------|
| 1 | Debug + fix audit logging (edge function silent failures) | Medium |
| 2 | Enforce `company_id` on creation for external requests | Low |
| 3 | Set `submitted_at` on creation/submission | Low |
| 4 | Add unique constraint on `(tenant_id, reference_number)` | Low |
| 5 | Add auto-expire cron for past-date pending passes | Medium |
| 6 | Separate visitor/worker entry logs from material gate pass logs OR enforce FK | Medium |
| 7 | Backfill existing data (company_id, submitted_at) | Low |

---

## Technical Details

### RLS Policy Coverage
- Admin: full CRUD via `is_admin()`
- Contractor Admin: full CRUD via `has_contractor_admin_access()`
- Contractor Rep: CRUD on own company passes via `contractor_representatives` join
- Security roles: SELECT + UPDATE for entry/exit recording
- Department Rep: SELECT + UPDATE for approval workflow
- Contractor Consultant: SELECT + UPDATE for external pass approval
- Public: SELECT own pass via `x-public-token` header
- Insert: role-based with `requested_by = auth.uid()` enforcement

### Index Coverage
Indexes exist on: `tenant_id`, `status`, `company_id`, `project_id`, `requested_by`, `branch_id`, `qr_code_token` (unique), `public_access_token`, `pass_date+status`, `start_date+end_date+status`, `club_mgmt_ack_by`

