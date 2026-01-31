# Acceptance Criteria & Verification Checklist

**Task:** Contractor Consultant Workflow Fixes
**Date:** October 26, 2023

## 1. Pool Assignment & Visibility
- [x] **Auto-Routing:** When a contractor observation is submitted, `approval_manager_id` is set to `NULL` (Unassigned) instead of a specific user.
- [x] **Pool Visibility:** Users with `contractor_consultant` role can see unassigned incidents in their branch via "My Pending Approvals".
- [x] **Claim Functionality:** Consultant can see "Claim Task" button on unassigned incidents. Clicking it assigns the incident to them (`approval_manager_id = user.id`).
- [x] **Assignment Lock:** Once claimed, other consultants see "Assigned to another user" or the incident disappears from their personal queue (depending on filter).

## 2. Screening & Routing
- [x] **Screening Completion:** Consultant can complete the screening form (notes, actions).
- [x] **Site Client Routing:** System attempts to route to `site_client` first.
- [x] **Fallback Cascade:**
    - If no Site Client: Routes to `hsse_expert` (Status: `pending_hsse_expert_review`).
    - If no HSSE Expert: Routes to `department_manager` (Status: `pending_department_manager_approval`).
    - If no Manager: Returns error (prevents stranding).

## 3. Frontend UX
- [x] **Consultant Card:** Correctly handles 3 states: Unassigned (Claim), Assigned to Me (Work), Assigned to Others (View/Block).
- [x] **Workspace Integration:** `InvestigationWorkspace` passes necessary assignment data to the card.

## 4. Code Quality & Security
- [x] **RLS:** Used existing `Branch-isolated` policies which are robust.
- [x] **RPC Security:** `can_approve_investigation` enforces role checks server-side.
- [x] **Type Safety:** Updated components to handle potential nulls safely.

## 5. Exclusions / Future Work
- **External Contractor Users:** RLS for `contractor_company_user` was not implemented due to missing schema linking users to companies. This requires a separate database migration task to add `company_id` to `profiles` or a link table.
