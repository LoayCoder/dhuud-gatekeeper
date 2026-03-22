

# Add Admin Override Visual Indicator to Pending Approvals

## Root Cause Finding

**The user Luay.Madkhali@golfsaudi.com has the `admin` role assigned.** The `can_approve_investigation` RPC correctly returns `TRUE` for admins on ALL workflow items (line 64: `IF v_is_admin THEN RETURN TRUE`). This is the intentional Admin Override architecture — not a bug. The 16 contractor observations appear because admin bypasses assignment checks.

The previous HSSE Expert fix (migration `20260322125912`) is correctly deployed and working. This is a separate concern about admin visibility UX.

## What Changes

Add a visual "Admin Override" badge to pending approval items where the current user is not the assigned owner but can act due to admin privileges. This makes it clear WHY items appear without changing any authorization logic.

## Implementation

### 1. Enrich `PendingIncidentApproval` type with override flag

In `src/hooks/use-pending-approvals/types.ts`, add an `isAdminOverride` boolean field to `PendingIncidentApproval`.

### 2. Set the flag in `usePendingIncidentApprovals` query

In `src/hooks/use-pending-approvals/use-pending-approval-queries.ts`, after the RPC check confirms `canApprove`, determine if this is an admin override by checking:
- User has admin role (via `hasRole('admin')`)
- User is NOT the `approval_manager_id` on the incident
- For contractor statuses, user is NOT the assigned consultant

Set `isAdminOverride: true` on matching items.

### 3. Show badge in `IncidentApprovalsList`

In `src/components/action-center/modules/IncidentApprovalsList.tsx`, render a small "Admin Override" badge (amber/warning color) next to items where `isAdminOverride === true`. This appears in the status or title column.

### 4. Show badge in Investigation Workspace pending list

In the investigation list view sidebar where pending items are shown, add the same visual indicator.

### 5. Add translations

Add `actionCenter.adminOverride` key to all 5 locale files (`en`, `ar`, `ur`, `hi`, `fil`) with value like "Admin Override" / "تجاوز المسؤول".

## Files to Modify

- `src/hooks/use-pending-approvals/types.ts` — add `isAdminOverride` field
- `src/hooks/use-pending-approvals/use-pending-approval-queries.ts` — compute override flag
- `src/components/action-center/modules/IncidentApprovalsList.tsx` — render badge
- `src/locales/en/translation.json` — add translation key
- `src/locales/ar/translation.json` — add translation key
- `src/locales/ur/translation.json` — add translation key
- `src/locales/hi/translation.json` — add translation key
- `src/locales/fil/translation.json` — add translation key

## No Backend Changes

The RPC and authorization logic remain unchanged. Admin override is working as designed.

