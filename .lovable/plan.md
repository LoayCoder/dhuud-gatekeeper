

# Why LUAY IBRAHIM Appears as Both Assignee and Reviewer — And How to Fix

## What Happened

For action **INS-2026-0004-ACT-0001**:

1. LUAY IBRAHIM was assigned as the **inspector** of the inspection session
2. When the corrective action was created from that session, LUAY was also set as the **assignee** (`assigned_to`)
3. The "Pending with" reviewer logic resolves the reviewer as the **Session Inspector** — which is also LUAY

So the system correctly shows "Pending with: LUAY IBRAHIM" because that's the inspector. But the **self-verification guard** (line 54 in ActionDetailSheet) blocks LUAY from verifying because `assigned_to === user.id`.

**Result:** Nobody can close this action through the normal flow — the designated reviewer IS the assignee.

## Root Cause

The action creation flow (`use-create-session-action.ts`) does not prevent the inspector from assigning actions to themselves. When inspector === assignee, the verification workflow deadlocks.

## Fix (2 changes)

### 1. Reviewer Fallback Logic — Detect Conflict & Resolve Alternative Reviewer

**Files:** `useMyActions.ts` (line 76-80) and `InspectionApprovalsList.tsx`

When `session.inspector_id === action.assigned_to`:
- Do NOT show the inspector as reviewer
- Instead show fallback: "HSSE Officer / Manager" with translation key `actions.hsseReviewer`
- This tells the assignee that an HSSE officer/manager/admin will verify it (not the inspector)

### 2. Pending Approvals Query — Ensure Non-Inspector Verifiers See the Action

**File:** `use-pending-approval-queries.ts` (line 46-48)

Currently the query fetches all `status = 'completed'` actions for verifiers. This already works — any HSSE officer/manager/admin who is NOT the assignee can see and verify the action. No query change needed.

### 3. ActionDetailSheet — Already Correct

Line 54 already blocks self-verification: `if (action.assigned_to === user.id) return false`. Any other authorized user (HSSE officer, HSSE manager, admin) who is NOT LUAY can open this action and verify/close it.

## How to Close This Action NOW

Another user with one of these roles must verify it:
- **HSSE Officer** (not LUAY)
- **HSSE Manager** (not LUAY)  
- **Another Admin** (not LUAY)

That person goes to **Action Center → Inspections → Pending Approvals**, finds the action, opens it, and clicks "Verify & Close".

## Preventive Fix (Optional)

**File:** `use-create-session-action.ts`

Add a warning or validation when creating an action where `assigned_to` equals the session's `inspector_id`, alerting the user that someone else will need to verify this action since the inspector cannot self-verify their own assignment.

## Summary of Code Changes

| File | Change |
|------|--------|
| `useMyActions.ts` | Add conflict check: if inspector === assignee, show "HSSE Reviewer" instead of inspector name |
| `InspectionApprovalsList.tsx` | Same conflict-aware reviewer display |
| (Optional) `use-create-session-action.ts` | Warn when assigning to self as inspector |

