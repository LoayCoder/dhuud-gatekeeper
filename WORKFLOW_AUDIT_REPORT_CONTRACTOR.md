# Contractor Consultant Workflow Audit Report

**Date:** October 26, 2023
**Auditor:** Principal Software Engineer

## 1. Executive Summary
The audit of the Contractor Consultant workflow revealed three critical gaps preventing the "Pool Assignment" model and "Robust Routing" requirements. The current system relies on single-user assignment and lacks fallback logic.

## 2. Workflow Map (Target State)

```mermaid
graph TD
    A[Contractor Observation Submitted] -->|Auto-Route| B{Contractor Consultant Exists?}
    B -- Yes --> C[Status: pending_consultant_screening]
    B -- No --> D[Fallback: Dept Rep / HSSE]

    C -->|Pool Assignment| E[Consultant Queue (Unassigned)]
    E -->|User Claims| F[Assigned to Consultant]
    F -->|Screening Complete| G{Site Client Exists?}

    G -- Yes --> H[Status: pending_site_client_approval]
    G -- No --> I{HSSE Expert Exists?}

    I -- Yes --> J[Status: pending_hsse_expert_review]
    I -- No --> K[Status: pending_dept_manager_approval]
```

## 3. Functional Audit Table

| Module | Step | Expected Behavior | Current Behavior | Gap | Severity | Fix Plan |
|--------|------|-------------------|------------------|-----|----------|----------|
| **Intake** | Auto-Routing | Route to "Pool" (Unassigned) if Consultant exists. | Assigns specific user (`LIMIT 1`) to `approval_manager_id`. | Prevents other consultants from seeing/claiming task. | **High** | Update `auto_route_observation_on_submit` to leave `approval_manager_id` NULL when routing to consultant. |
| **Screening** | Completion | Route to Site Client -> HSSE Expert -> Dept Manager (Cascade). | Routes strictly to Site Client (`LIMIT 1`). Fails or strands if missing. | Tickets stuck if no Site Client exists. | **Critical** | Update `consultant_complete_screening` to implement cascade fallback logic. |
| **Visibility** | External Access | Contractor Company Users can see their company's incidents. | No explicit RLS policy found for `contractor` role. | External users cannot access their data. | **Critical** | Create RLS policy for `incidents` checking `related_contractor_company_id`. |
| **UI** | Queue Management | Consultants see "Unassigned" tasks and can "Claim" them. | UI likely filters by `assignee = me`. No "Claim" button. | Consultants cannot pick up new work. | **High** | Update `InvestigationWorkspace` to show unassigned pool and add `Claim` button. |
| **RLS** | Pool Visibility | Consultants can view unassigned incidents in their branch. | `Branch-isolated view` allows access, but relying on `approval_manager_id` filter hides them. | RLS is technically open, but Frontend/Query logic needs to align. | **Med** | Ensure queries fetch `approval_manager_id IS NULL` for consultants. |

## 4. Implementation Plan Details

### Database Changes
1.  **`auto_route_observation_on_submit`**:
    *   Remove `v_assigned_to` assignment for Consultant path.
    *   Set `approval_manager_id` to NULL.
2.  **`consultant_complete_screening`**:
    *   Add logic to check `site_client` existence.
    *   Else check `hsse_expert`.
    *   Else check `department_manager`.
    *   Update status accordingly.
3.  **RLS for Contractors**:
    *   Add policy: `SELECT` on `incidents` where `related_contractor_company_id` matches user's company (via profile linkage).

### Frontend Changes
1.  **`InvestigationWorkspace`**:
    *   Add tab/filter for "Unassigned Team Tasks".
    *   Add "Assign to Me" button for `pending_consultant_screening` status.
