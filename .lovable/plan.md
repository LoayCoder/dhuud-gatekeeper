

# E2E Gate Pass Lifecycle — Gap Analysis & Implementation Plan

## Current State Summary

The gate pass system is a **material movement** pass system (not a worker-based gate pass). Key observations:

- **`material_gate_passes`** table tracks material in/out passes, NOT worker-linked passes
- Gate passes are linked to **projects** and **companies**, not individual workers
- The workflow is: `pending_contractor_approval` → `pending_club_mgmt_ack` → `pending_security_approval` → `approved` → `used` → `completed`
- Photo requirements are on **items** (material photos), not worker photos
- ID Card generation is a **separate** worker workflow, not part of gate pass lifecycle
- Induction is also a **separate** worker workflow

## Test Plan vs Reality — Gaps Identified

Many test cases in the plan assume a **worker-centric gate pass** model that does not exist. The actual system is a **material gate pass** system. Here is the breakdown:

### Phase 1: Project Requirement Gate — PARTIALLY EXISTS

| Test | Status | Detail |
|------|--------|--------|
| 1.0: Button disabled without project | ✅ EXISTS | Line 89 of `GatePasses.tsx`: `disabled={activeProjects.length === 0}` |
| 1.0: Warning message shown | ❌ MISSING | No "No active projects" message displayed when button is disabled |
| 1.0: Link to projects page | ❌ MISSING | No navigation link provided |
| 1.1: Enable after project created | ✅ EXISTS | Button enables when `activeProjects.length > 0` |
| 1.2: Project dropdown in form | ✅ EXISTS | `GatePassFormDialog` receives `projects` prop |
| 1.3: Inactive project filtering | ✅ EXISTS | Only active projects passed: `projects?.filter(p => p.status === "active")` |
| 1.4: Admin override | ✅ EXISTS | Admin uses separate `/contractors/gate-passes` route with different permissions |

### Phase 2: Gate Pass Creation — MOSTLY EXISTS (but material-based, not worker-based)

| Test | Status | Detail |
|------|--------|--------|
| 2.1: Create gate pass | ✅ EXISTS | `GatePassFormDialog` and `GatePassCreateWizard` both work |
| 2.1: Worker selection | ❌ N/A | System is material-based, not worker-based |
| 2.1: Worker photo check | ❌ N/A | Photo requirement is on items, not workers |
| 2.2: Validation rules | ✅ PARTIAL | Item name required, photos required per item, dates validated |
| 2.3: Appears in list | ✅ EXISTS | React Query invalidation refreshes list |

### Phase 3: Photo Requirement — EXISTS BUT FOR ITEMS, NOT WORKERS

| Test | Status | Detail |
|------|--------|--------|
| 3.1: Photo gate | ✅ EXISTS (items) | `GatePassItemPhotoUpload` requires photos per material item |
| 3.1: Worker photo gate | ❌ N/A | Not applicable to material gate passes |

### Phase 4: Submission Workflow — EXISTS

| Test | Status | Detail |
|------|--------|--------|
| 4.1: Submit for approval | ✅ EXISTS | Created with status `pending_contractor_approval` or `pending_dept_approval` |
| 4.2: Cannot edit after submission | ❌ PARTIALLY | No explicit edit lock in UI |

### Phase 5: Admin Approval — EXISTS

| Test | Status | Detail |
|------|--------|--------|
| 5.1: View pending | ✅ EXISTS | `usePendingGatePassApprovals` hook, admin gate pass list |
| 5.2: Approve | ✅ EXISTS | `approve_gate_pass_unified` RPC handles multi-stage approval |
| 5.3: Reject | ✅ EXISTS | `rejectGatePass` with reason |
| 5.4: Resubmit | ✅ EXISTS | `GatePassResubmitDialog` with `useResubmitGatePass` |

### Phase 6-7: Induction & ID Card — SEPARATE WORKFLOWS

These are worker management features, NOT part of the material gate pass lifecycle. They exist independently:
- Worker induction: `use-worker-inductions.ts`, `use-worker-onboarding.ts`
- ID Card generation: `use-contractor-id-cards.ts`

### Phase 8-9: Status Flow & Permissions — EXISTS

| Test | Status | Detail |
|------|--------|--------|
| 8.1: Status progression | ✅ EXISTS | Via `approve_gate_pass_unified` RPC |
| 9.1: Contractor rep permissions | ✅ EXISTS | `can_create_gate_pass` RPC, RLS policies |
| 9.2: Admin permissions | ✅ EXISTS | Admin bypass in hooks and RLS |

### Phase 10: Data Persistence — EXISTS (standard Supabase)

### Phase 11: Integration — PARTIAL

| Test | Status | Detail |
|------|--------|--------|
| 11.1: Dashboard integration | ✅ EXISTS | Dashboard shows pass counts |
| 11.2: Workers page integration | ❌ N/A | Material passes not linked to workers |
| 11.4: Activity log | ✅ EXISTS | `ContractorPortalActivityLog` page |

## Actionable Gaps to Fix

Based on the **actual material gate pass model**, here are the real gaps:

### Gap 1: No "No Active Projects" Warning Message
The button is disabled but no message explains why. Need to add a warning alert when `activeProjects.length === 0`.

### Gap 2: No Link to Projects Page
When no projects exist, provide a "Create a project first" link to `/contractor-portal/projects`.

### Gap 3: No Edit Lock After Submission
After a pass is submitted (status != draft/rejected), the UI should prevent edits. Currently there's no explicit guard.

### Gap 4: Missing Audit Trail for Gate Pass Actions
The `materialGatePassCreateService` and `materialGatePassActionService` do not log to any audit table. The `useContractorAuditLog` hook exists but is not used for gate pass operations.

### Gap 5: WhatsApp Notification on Gate Pass Rejection Missing Reason
The rejection notification was recently added but the rejection reason display could be more prominent in the contractor portal detail view.

## Implementation Plan

### Step 1: Add "No Active Projects" Warning + Link
**File:** `src/pages/contractor-portal/GatePasses.tsx`
- When `activeProjects.length === 0`, show an Alert with warning icon
- Message: "No active projects. Create a project first."
- Button/link navigating to `/contractor-portal/projects`

### Step 2: Add Audit Logging for Gate Pass Actions
**Files:**
- `src/features/contractors/services/materialGatePassCreateService.ts` — add audit log call after creation
- `src/features/contractors/services/materialGatePassActionService.ts` — add audit log calls after approve/reject

Use the existing `contractor-audit-log` edge function pattern.

### Step 3: Add Edit Lock for Submitted Passes
**File:** `src/features/contractors/components/GatePassDetailDialog/` — disable edit actions when status is not `rejected`

### Step 4: Improve Rejection Reason Display in Portal
**File:** Gate pass detail dialog — ensure rejection reason is prominently shown with red styling when pass is rejected

## What Does NOT Need Changes

- The test plan's worker-centric assumptions (worker photo gate, induction gate, ID card in gate pass lifecycle) do not apply — these are separate modules that already work independently
- Multi-stage approval workflow already works via `approve_gate_pass_unified` RPC
- Project filtering, permissions, and data isolation already exist
- Resubmission flow already exists

## Summary

| Step | Files | Effort |
|------|-------|--------|
| 1. No-project warning + link | `GatePasses.tsx` | Small |
| 2. Audit logging for gate passes | `materialGatePassCreateService.ts`, `materialGatePassActionService.ts` | Small |
| 3. Edit lock on submitted passes | Gate pass detail components | Small |
| 4. Rejection reason display | Gate pass detail dialog | Small |

