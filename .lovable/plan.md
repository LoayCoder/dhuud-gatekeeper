

# E2E Gate Pass Lifecycle — Test Results & Gap Report

## Critical Architecture Mismatch

The test plan assumes a **worker-centric gate pass** model. The actual system is a **material movement gate pass** system. This fundamentally changes ~40% of the test cases.

### What DOES NOT EXIST in the schema:
- **`worker_id`** column — material_gate_passes has NO worker_id FK
- **`submitted_at` / `submitted_by`** columns — don't exist
- **`approved_at` / `approved_by`** columns — don't exist (uses `pm_approved_at/by`, `safety_approved_at/by`, `contractor_approved_at/by`)
- **`description`** column — doesn't exist (uses `material_description`)
- **`id_card_generated`** column — doesn't exist on gate passes
- **`resubmission_count`** column — doesn't exist
- **`photo_url`** on contractor_workers — doesn't exist (uses `photo_path`)
- **`induction_completed`** on contractor_workers — doesn't exist
- **`id_card_generated` / `id_card_generated_by`** on contractor_workers — don't exist

### What DOES EXIST:
- `photo_path`, `photo_verified_at`, `photo_verified_by` on contractor_workers ✅
- `id_card_generated_at` on contractor_workers ✅
- `audit_logs` table with proper schema ✅
- FK constraints: `company_id` → contractor_companies, `project_id` → contractor_projects ✅
- RLS policies for tenant isolation, contractor reps, admins, security ✅
- Soft delete pattern (`deleted_at`) ✅

---

## Phase-by-Phase Results

### Phase 1: Project Requirement Gate
| Test | Status | Finding |
|------|--------|---------|
| 1.0: Button disabled without project | ✅ PASS | Code confirms `disabled={activeProjects.length === 0}` |
| 1.0: Warning message | ✅ PASS | Recently added Alert with link to projects page |
| 1.1: Enable after project | ✅ PASS | Button enables when active projects > 0 |
| 1.2: Multiple projects | ✅ PASS | Project dropdown shows active projects |
| 1.3: Inactive project filter | ✅ PASS | Only `status = 'active'` projects shown |
| 1.4: Admin override | ✅ PASS | Admin RLS policy bypasses company filter |

### Phase 2: Gate Pass Creation
| Test | Status | Finding |
|------|--------|---------|
| 2.1: Create gate pass | ✅ PASS | Form works, items + photos |
| 2.1: Worker selection | ❌ N/A | System is material-based, no worker_id |
| 2.1: Worker photo check | ❌ N/A | Photo gate is on items, not workers |
| 2.2: Validation | ✅ PARTIAL | Item name required; no explicit date validation in DB |
| 2.3: Appears in list | ✅ PASS | React Query invalidation |

### Phase 3: Photo Requirement
| Test | Status | Finding |
|------|--------|---------|
| 3.1-3.2: Worker photo gate | ❌ N/A | Not applicable — material gate pass requires item photos, not worker photos |

### Phase 4: Submission Workflow
| Test | Status | Finding |
|------|--------|---------|
| 4.1: Submit for approval | ✅ PASS | Created directly as `pending_contractor_approval` or `pending_dept_approval` |
| 4.1: submitted_at tracking | ❌ MISSING | No `submitted_at` column exists |
| 4.2: Edit lock after submission | ✅ PARTIAL | UI conditionally shows actions; no explicit DB constraint |

### Phase 5: Approval
| Test | Status | Finding |
|------|--------|---------|
| 5.1: View pending | ✅ PASS | Admin + dept rep RLS policies |
| 5.2: Approve | ✅ PASS | `approve_gate_pass_unified` RPC handles multi-stage |
| 5.3: Reject | ✅ PASS | `rejection_reason`, `rejected_by`, `rejected_at` columns exist |
| 5.4: Resubmit | ✅ PASS | `GatePassResubmitDialog` exists |
| 5.4: Resubmission count | ❌ MISSING | No `resubmission_count` column |

### Phase 6-7: Induction & ID Card in Gate Pass
| Test | Status | Finding |
|------|--------|---------|
| All | ❌ N/A | Induction and ID Card are **separate worker workflows**, not part of gate pass lifecycle. Gate pass statuses are: `pending_*` → `approved` → `used` → `completed` |

### Phase 8: Status Flow
| Test | Status | Finding |
|------|--------|---------|
| 8.1: Actual flow | ✅ EXISTS | `pending_contractor_approval` → `pending_club_mgmt_ack` → `pending_security_approval` → `approved` → `used` → `completed` |
| 8.1: Test plan flow | ❌ MISMATCH | Test assumes Draft → Pending → Approved → ID Card Generated. Actual flow is multi-stage approval |
| 8.2: No backwards | ✅ PARTIAL | Enforced by `approve_gate_pass_unified` RPC logic, not by DB constraint |

### Phase 9: Multi-Role Permissions
| Test | Status | Finding |
|------|--------|---------|
| 9.1: Contractor rep isolation | ✅ PASS | RLS: `EXISTS contractor_representatives WHERE company_id = mgp.company_id AND user_id = auth.uid()` |
| 9.2: Admin access | ✅ PASS | RLS: `is_admin(auth.uid())` |
| 9.3: Document controller | ✅ PASS | `has_contractor_admin_access()` |
| 9.4: Unauthorized | ✅ PASS | RLS enforces; no cross-company leakage |

### Phase 10: Data Persistence
| Test | Status | Finding |
|------|--------|---------|
| 10.1: FK integrity | ✅ PASS | FKs on company_id, project_id confirmed |
| 10.2: Photo storage | ✅ PASS | `gate-pass-photos` bucket for item photos |
| 10.3: Audit trail | ⚠️ PARTIAL | `contractor-audit-log` edge function logs to its own mechanism, NOT to `audit_logs` table. Need to verify where audit data lands |
| 10.5: Data relationships | ✅ PASS | FK constraints enforce referential integrity |

### Phase 11-12: Integration
| Test | Status | Finding |
|------|--------|---------|
| Dashboard integration | ✅ PASS | Dashboard shows pass counts |
| Worker page integration | ❌ N/A | No worker_id on gate passes |
| Project page integration | ✅ PARTIAL | Gate passes link to projects |
| Activity log | ✅ PASS | Portal activity log exists |

### Phase 14: Performance
| Test | Status | Finding |
|------|--------|---------|
| 14.2: Indexes | ⚠️ GAP | Missing indexes on `company_id` and `status` (standalone). Existing: `date_status` composite, `project_id`, `branch_id`, `qr_token` |

---

## Actionable Gaps to Fix (Prioritized)

### 🔴 Critical — Database Indexes Missing
**Missing indexes** that will cause performance issues at scale:
- `company_id` — used in every contractor rep query
- `status` standalone — used in admin filtering
- `requested_by` — used in "my passes" queries
- `tenant_id` — used in every RLS check

### 🟠 High — Audit Trail Not Writing to `audit_logs` Table
The `contractor-audit-log` edge function was recently wired up but it writes to an unknown destination. The `audit_logs` table exists with proper schema. Need to verify the edge function inserts into `audit_logs`.

### 🟡 Medium — Missing Tracking Columns
Consider adding for full lifecycle tracking:
- `submitted_at` / `submitted_by` — currently the pass is created directly in a pending state, so there's no separate submission timestamp

### Test Plan Corrections Needed
The test plan should be rewritten to match the **material gate pass** model:
- Remove all `worker_id` references
- Remove Phases 3, 6, 7 (worker photo gate, induction, ID card are separate)
- Update status flow to actual: `pending_contractor_approval` → `pending_club_mgmt_ack` → `pending_security_approval` → `approved`
- Replace "worker photo" tests with "item photo" tests

---

## Implementation Plan

### Step 1: Add Missing Performance Indexes
Add indexes on `company_id`, `status`, `requested_by`, and `tenant_id` for the `material_gate_passes` table.

### Step 2: Verify Audit Trail Destination
Check the `contractor-audit-log` edge function to confirm it writes to `audit_logs` table. If not, fix it.

### Step 3: (Optional) Add `submitted_at` Column
If lifecycle tracking is desired, add a `submitted_at` timestamp column for clearer audit trail.

| Step | Change | Effort |
|------|--------|--------|
| 1. Add indexes | DB migration | Small |
| 2. Verify audit destination | Edge function check | Small |
| 3. Add submitted_at | DB migration + service update | Small |

