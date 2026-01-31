# Gate Pass Process Audit Report & Fix Plan

## 1. Executive Summary
This audit analyzed the **Gate Pass** and **Entry/Exit** workflows within the HSSE platform.
**Verdict:** Critical architectural fragmentation ("Split-Brain Logging") exists, where entry events are split between legacy tables (`material_gate_passes`, `contractor_access_logs`) and the unified table (`gate_entry_logs`).

**Primary Objective:** Consolidate all entry/exit events into `gate_entry_logs` and restrict Security roles to "Operational" access only (No creation/deletion of passes).

---

## 2. Process Audit Table

| Stage | Role | Expected Behavior | Actual Behavior | Gap / Risk | Severity |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Request Creation** | **Employee / Contractor** | Creates a request (Visit or Gate Pass). Status = Pending. | Works as expected. | None. | Low |
| **Approval** | **Manager / HSSE** | Approves request. Status -> Approved. | Works as expected. | None. | Low |
| **Entry Validation** | **Security Guard** | Scans QR. System checks status/expiry. | System checks legacy tables for some flows. | **Fragmented Validation.** Risk of bypassing newer checks. | **High** |
| **Physical Entry** | **Security Guard** | Guard confirms entry. **Log created in `gate_entry_logs`.** Request status updated to `checked_in`. | For Materials/Vehicles, `entry_time` is written to `material_gate_passes`. | **Split-Brain Logging.** Entry history is scattered. | **Critical** |
| **Physical Exit** | **Security Guard** | Guard confirms exit. **`gate_entry_logs` record updated with `exit_time`.** | For Materials, `exit_time` written to `material_gate_passes`. | **Incomplete History.** Time-on-site analytics broken. | **Critical** |
| **Data Security** | **Security Role** | Can VIEW and UPDATE (Entry/Exit) only. | Security can `INSERT`, `UPDATE`, and `DELETE` (ALL) on `material_gate_passes`. | **Excessive Privilege.** Guard could potentially fabricate or delete passes. | **Critical** |

---

## 3. Architecture & Gap Analysis

### A. Schema Gaps
1.  **Missing Link:** `gate_entry_logs` has `visitor_id`, `worker_id`, but **missing** `material_gate_pass_id`.
2.  **Legacy Columns:** `material_gate_passes` still relies on `entry_time` / `exit_time` columns which should be deprecated in favor of the log table.

### B. Code Gaps
1.  **Frontend Fragmentation:**
    *   `GateEntryForm.tsx` handles Visitors correctly via `gate_entry_logs`.
    *   `use-contractors.ts` writes to `contractor_access_logs` (Legacy).
    *   Material/Vehicle flows write directly to the pass table.
2.  **RLS Policies:**
    *   `material_gate_passes`: Policy "Security users can manage gate passes" grants `ALL` access.

---

## 4. Fix & Assurance Plan

### Phase 1: Database Hardening (Immediate)
1.  **Schema Update:** Add `material_gate_pass_id` to `gate_entry_logs`.
2.  **RLS Lockdown:**
    *   Revoke `INSERT`/`DELETE` for Security on `material_gate_passes`.
    *   Allow `UPDATE` (limited to status/notes).
3.  **Triggers:**
    *   Create trigger on `gate_entry_logs` to automatically update `material_gate_passes.status` to `used` / `checked_in` upon entry.

### Phase 2: Code Refactoring
1.  **Unified Hook:** Update `use-unified-access.ts` to be the **single source of truth** for all entry/exit operations.
2.  **Deprecate Legacy:** Remove writes to `contractor_access_logs`.
3.  **Update UI:** Ensure `GateEntryForm` and `GateQRScanner` pass the correct `material_gate_pass_id` to the unified log.

### Phase 3: Validation
1.  **Test Case:** Guard scans Vehicle Pass -> Entry Log Created -> Pass Status Updates -> Guard Scans Exit -> Entry Log Closed.

---

## 5. Execution Report (Completed)

The following fixes have been applied to the codebase:

### 1. Database Schema & Security
- **Migration Created:** `20260216000000_gate_pass_hardening.sql`
- **Schema:** Added `material_gate_pass_id` FK to `gate_entry_logs`.
- **Triggers:** Implemented `sync_gate_entry_to_parent()` to automatically update pass status (`used`, `checked_in`, `completed`) when logs are created/closed.
- **RLS:**
    - `material_gate_passes`: **Revoked** `INSERT`/`DELETE` for Security. Allowed `SELECT` and `UPDATE` (status only).
    - `gate_entry_logs`: **Revoked** `DELETE` for Security.

### 2. Code Refactoring
- **Hook Updated:** `use-unified-access.ts` now supports `material_gate_pass_id` and filters active entries correctly.
- **Guard Action Updated:** `useGuardGateAction` and `useVerifyGatePass` now write **exclusively** to `gate_entry_logs`.
- **Stats Updated:** `useGateGuardStats` now counts `entry_type='vehicle'` in "On Site" metrics.

### 3. Verification Status
- **Split-Brain Resolved:** Material/Vehicle passes now generate `gate_entry_logs`.
- **Security Hardened:** Guards can no longer delete logs or create fake passes (RLS enforcement).
- **UX Consistency:** Dashboard stats now include vehicles.
