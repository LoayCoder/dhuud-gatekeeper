# Fix & Assurance Plan: Incident Workflow Hardening

**Date:** 2025-05-20
**Author:** Jules (AI Principal Engineer)
**Status:** ✅ Complete

## 1. Executive Summary
This plan addressed critical gaps in the Incident & Observation workflow. All items have been resolved.

---

## 2. Identified Gaps & Final Status

### Gap 1: Incident Closure Blocked (RCA Disconnect)
**STATUS: ✅ RESOLVED**
- Frontend fetches from `incident_rca` table via `investigationQueryService.ts`
- `lockRCA()` and `unlockRCA()` RPCs implemented in `investigationMutationService.ts`
- `RCAPanel.tsx` displays all RCA fields with lock/unlock UI
- `workflow-validation.ts` enforces `is_locked` before closure

### Gap 2: Loose Data Visibility (RLS)
**STATUS: ✅ RESOLVED**
- RLS policy `incident_rca_restricted_select` restricts SELECT to:
  - HSSE roles (via `has_hsse_incident_access`)
  - The incident's `approval_manager_id`
  - Assigned investigators

### Gap 3: Action Evidence & Verification Weakness
**STATUS: ✅ RESOLVED**
- `ActionProgressDialog.tsx` hard-blocks submission when `evidenceCount === 0`
- Submit button is `disabled={!isValid}` which includes evidence check

### Gap 4: SLA Logic Coverage
**STATUS: ✅ RESOLVED (No change needed)**
- `check_sla_escalation` function verified correct in backend

---

## 3. Assurance & Verification Criteria

| Process Step | Expected Result | Status |
| :--- | :--- | :--- |
| RCA Locking | UI becomes read-only when locked | ✅ |
| Closure Gate (Unlocked RCA) | System blocks closure | ✅ |
| Closure Gate (Locked RCA + Evidence) | Incident closes | ✅ |
| RLS Access (Regular User) | Returns 0 rows | ✅ |
| RLS Access (Approver/HSSE) | Returns data | ✅ |
| Action without evidence | Button disabled | ✅ |
