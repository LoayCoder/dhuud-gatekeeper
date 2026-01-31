# Fix & Assurance Plan: Incident Workflow Hardening

**Date:** 2025-05-20
**Author:** Jules (AI Principal Engineer)
**Status:** In Progress

## 1. Executive Summary
This plan addresses critical gaps identified during the deep audit of the Incident & Observation workflow. The primary objective is to align the Frontend with the V1.1 Backend Schema, enforce mandatory validation gates (RCA Locking, Evidence), and tighten Role-Based Access Control (RLS).

**Criticality:** High (Production Blocking)
**Impact:** Enables Incident Closure, enforces Governance, prevents Data Leakage.

---

## 2. Identified Gaps & Remedies

### Gap 1: Incident Closure Blocked (RCA Disconnect)
*   **Issue:** The database strictly requires `incident_rca.is_locked = true` to close an incident. The frontend uses the legacy `investigations` table and lacks the UI to populate or lock `incident_rca`.
*   **Root Cause:** Frontend/Backend schema mismatch (V1.1 migration applied to DB but not UI).
*   **Fix:**
    *   **Frontend:** Refactor `useInvestigation` to fetch/mutate `incident_rca`.
    *   **Frontend:** Update `InvestigationWorkspace` to display RCA fields from the new table.
    *   **Frontend:** Add "Lock RCA" action (visible only to HSSE Managers) that calls the `unlock_rca` (or new `lock_rca`) RPC/endpoint. *Note: We might need to create a `lock_rca` function if only `unlock_rca` exists.*

### Gap 2: Loose Data Visibility (RLS)
*   **Issue:** The `incident_rca` table allows `SELECT` for all authenticated users in the tenant (`tenant_id = get_auth_tenant_id()`). This exposes sensitive root cause data to non-privileged users.
*   **Risk:** Data Leakage / Confidentiality Breach.
*   **Fix:**
    *   **Database:** Update RLS policy for `incident_rca` to restrict `SELECT` to:
        *   HSSE Roles (Manager, Expert, Investigator)
        *   Admins / Super Admins
        *   The Incident's `approval_manager_id` (e.g., Site Client)
        *   Investigation Team Members (if applicable)

### Gap 3: Action Evidence & Verification Weakness
*   **Issue:** "Action Verification" gate (n57) is mentioned as critical but not strictly enforced in the backend trigger for *action* closure (only *incident* closure checks incident evidence). Frontend validation is soft.
*   **Fix:**
    *   **Frontend:** Hard-block the "Complete" and "Verify" buttons in `ActionProgressDialog` / `ActionVerificationDialog` if evidence count is 0.
    *   **Backend:** Add a Trigger or Check Constraint on `corrective_actions` (or `action_evidence`) to prevent status transition to `closed` if no evidence exists. (Time permitting, or enforce strictly in UI).

### Gap 4: SLA Logic Coverage
*   **Status:** **Resolved in Backend.** The `check_sla_escalation` function was found to be correct.
*   **Action:** No code change required. Verification only.

---

## 3. Implementation Steps

### Phase 1: Database & Security (Backend)
1.  **RLS Update:** Apply stricter `SELECT` policy on `incident_rca`.
2.  **Locking Function:** Ensure a `lock_rca(incident_id)` function exists (we saw `unlock_rca` but need to confirm locking mechanism, likely just an `UPDATE` allowed by RLS, but a dedicated RPC is safer).
3.  **Action Evidence Trigger:** Create trigger `enforce_action_evidence` to block action closure without evidence.

### Phase 2: Frontend Refactoring (Investigation)
1.  **Type Definition:** Update `Investigation` type to include `rca_locked`, `rca_lock_date`, `rca_locked_by` (from `incident_rca` table).
2.  **Hook Update:** Modify `useInvestigation` to join/fetch `incident_rca` data.
3.  **UI Integration:**
    *   Bind RCA text areas (5 Whys, Root Cause) to `incident_rca` fields.
    *   Implement "Lock RCA" button in the RCA tab (HSSE Manager only).
    *   Disable editing if `is_locked` is true.

### Phase 3: Frontend Refactoring (Actions)
1.  **Validation:** In `ActionProgressDialog`, verify evidence array length > 0 before allowing "Submit for Verification".
2.  **Verification UI:** Ensure `ActionVerificationDialog` shows evidence clearly and requires acknowledgement.

---

## 4. Assurance & Verification Criteria

| Process Step | Test Case | Expected Result |
| :--- | :--- | :--- |
| **RCA Locking** | HSSE Manager clicks "Lock RCA" | DB `incident_rca.is_locked` becomes `true`. UI becomes read-only. |
| **Closure Gate** | Try closing incident with Unlocked RCA | System throws error (Trigger `enforce_incident_closure_gate`). |
| **Closure Gate** | Try closing incident with Locked RCA + Evidence | Incident transitions to `closed`. |
| **RLS Access** | Regular User attempts to fetch `incident_rca` | Returns 0 rows or Permission Denied. |
| **RLS Access** | Site Client (Approver) attempts to fetch `incident_rca` | Returns data. |
| **Action** | User tries to complete action without file | Button disabled or Error message shown. |

---
