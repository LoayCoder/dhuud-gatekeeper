# Workflow V1.1 Audit Report

**Date:** 2025-05-20
**Auditor:** Jules (AI Software Engineer)
**Scope:** Verification of Incident Management & Investigation Workflow against Mermaid V1.1 Specification.

## 1. Executive Summary

The current implementation **does not fully match** the Mermaid V1.1 workflow. While the high-level process flow (Submission -> Screening -> Investigation -> Closure) is in place, strict validation gates, automated SLA enforcement, and specific sub-process loops are either missing, partially implemented, or rely on legacy schema structures.

**Compliance Score:** ~60%
**Critical Defects:** 4 (Validation Gates, Action Evidence, SLA Scope, RCA Locking)

---

## 2. Critical Validation Gates (Hard Check)

| Gate ID | Name | Status | Findings |
| :--- | :--- | :--- | :--- |
| **n26** | **System Data Validation** | 🔴 **FAILED** | • **Backend:** `check_incident_closure_prerequisites` checks for RCA/Cause existence but **ignores** Evidence count, Witness Statement status, and Impact Tab completion.<br>• **Frontend:** `useInvestigationCompleteness` is used but acts as a soft check (UI disable) rather than a hard system gate.<br>• **RCA:** The system does not enforce `incident_rca.is_locked`. The frontend binds to the legacy `investigations` table, ignoring the V1.1 `incident_rca` table and its locking mechanism. |
| **n57** | **Action Evidence Validation** | 🔴 **FAILED** | • **Logic:** `useVerifyAction` mutation allows marking an action as 'closed' without checking for associated `action_evidence`.<br>• **UI:** `ActionVerificationDialog` displays evidence but does not disable verification if the list is empty. |

## 3. SLA & Auto-Escalation

| Node ID | Name | Status | Findings |
| :--- | :--- | :--- | :--- |
| **n10** | **System: SLA Timer** | 🟠 **PARTIAL** | • **Implemented:** SLA logic exists in `check_sla_escalation` but is hardcoded to check *only* `pending_expert_screening` status.<br>• **Missing:** The timer ignores other critical screening statuses defined in the workflow: `pending_dept_rep_approval`, `pending_consultant_screening`, `pending_site_client_approval`, and `pending_contractor_implementation`. |
| **n11** | **Action Taken?** | 🟠 **PARTIAL** | • Auto-escalation logic exists for the Expert Screening phase but is absent for Department and Contractor screening phases. |

## 4. AI Analysis & Data Flow

| Component | Status | Findings |
| :--- | :--- | :--- |
| **Trigger** | 🟠 **DEVIATION** | • **Requirement:** "Triggers immediately after DescEntry".<br>• **Implementation:** Manual "AI Analyze" button in `IncidentReport.tsx`. No automatic trigger on blur or entry completion. |
| **Outputs** | 🟢 **PASS** | • Successfully populates Title, Description, Category, Severity, Injury, Damage, and Actions as designed. |

## 5. Sub-Process Loops

| Loop | Status | Findings |
| :--- | :--- | :--- |
| **Witness Return** | 🟢 **PASS** | • `WitReview` -> `WitReturn` path is fully implemented via `useReviewWitnessStatement` (sets status to `pending` with return reason). |
| **Impact Loops** | 🔴 **MISSING** | • **Clinic/Tech/Env Assignment:** No logic found to auto-assign "Clinic User" (n29), "Tech Evaluator" (n40), or "Env Expert" (n48).<br>• **Return Paths:** Specific return loops for these sub-tabs (n34, n45, n53) are not implemented; they rely on the generic investigation return flow. |
| **RCA Locking** | 🔴 **MISSING** | • `RCALock` and `RCALocked` nodes are unimplemented in the frontend. The system allows progression without a formal "Lock RCA" step by an HSSE Manager. |

## 6. Role & Authority Enforcement

| Role Check | Status | Findings |
| :--- | :--- | :--- |
| **HSSE Validation** | 🟢 **PASS** | • `hsse_validate_incident_closure` strictly enforces HSSE roles (Manager/Expert/Admin). |
| **Unlock RCA** | ⚪ **UNVERIFIED** | • Database function `unlock_rca` exists and enforces HSSE Manager role, but it is effectively unreachable because the frontend does not use the `incident_rca` table. |

## 7. Recommendations

1.  **Migrate Frontend to V1.1 Schema:** Update `useInvestigation` hooks to use `incident_rca` table instead of legacy columns in `investigations`. Implement the "Lock RCA" UI.
2.  **Harden n26 Gate:** Update `check_incident_closure_prerequisites` (or create `validate_investigation_gate`) to perform SQL-level counts on `incident_evidence` (>0) and `witness_statements` (all approved).
3.  **Enforce n57:** Update `verifyAction` mutation or database trigger to raise an exception if `action_evidence` count is 0 when status becomes 'closed'.
4.  **Expand SLA Logic:** Update `check_sla_escalation` to include all screening statuses (`pending_dept_rep_approval`, `pending_consultant_screening`, etc.) in the timeout check.
5.  **Automate AI:** Add an `onBlur` or debounced effect to the Description field to trigger AI analysis automatically.
