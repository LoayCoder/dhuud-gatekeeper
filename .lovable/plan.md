

## Why Admin Cannot Take Action on Consultant-Stage Observations

### Root Cause

The `ConsultantReviewCard` (the UI component that renders the approval controls for observations in `expert_screening` / `pending_consultant_screening` statuses) uses `useCanReviewAsConsultant()` to check permissions. This hook **only** checks `has_contractor_consultant_access_for_branch` -- it does NOT check for admin role. So even though the database RPC `can_approve_investigation` returns TRUE for admins, the **frontend UI card** hides the approval controls from them.

```text
Database (can_approve_investigation):  Admin → TRUE  ✓
Frontend (useCanReviewAsConsultant):   Admin → FALSE ✗  ← blocks UI
```

### Fix

**File:** `src/hooks/use-consultant-workflow.ts` (lines ~145-175)

In `useCanReviewAsConsultant`, after the status/contractor checks pass, add an admin role check before the `has_contractor_consultant_access_for_branch` RPC call:

1. Import `has_role` check or call the existing `is_admin` RPC
2. If the user is admin, return `true` immediately (skip the consultant-specific branch check)
3. Otherwise, continue with the existing `has_contractor_consultant_access_for_branch` check

This aligns the frontend permission gate with the database-level permission that already grants admin access.

### Changes

**`src/hooks/use-consultant-workflow.ts`** — In `useCanReviewAsConsultant`, after confirming `statusValid && hasContractor`, add:

```typescript
// Admin can always review contractor observations
const { data: isAdmin } = await supabase.rpc('is_admin');
if (isAdmin) return true;

// Otherwise check contractor consultant branch access
const { data: hasAccess, error } = await supabase.rpc('has_contractor_consultant_access_for_branch', { ... });
```

This is a single-file change that unblocks admin users from taking action on contractor observations stuck in consultant workflow stages.

