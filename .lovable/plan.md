

## Fix: Public Gate Passes Hidden from Security Supervisor Queue

### Problem
The Gate Pass tab on `/security/access-control` shows "No pending approvals" even though there are public gate passes at `pending_security_approval` status.

### Root Cause
In `usePendingGatePassApprovals` (line 224 of `use-material-gate-passes.ts`):

```typescript
.neq("requested_by", user.id) // Exclude own requests (can't self-approve)
```

Public gate passes submitted by unauthenticated users have `requested_by = NULL`. In SQL, `NULL != 'some_id'` evaluates to `NULL` (falsy), so PostgREST **excludes all rows where `requested_by` is NULL**.

This means every public gate pass is silently filtered out.

### Database Evidence
- 2 passes at `pending_security_approval`: both are public (`PUB-20260210-*`) with `requested_by = NULL`
- The logged-in user (`luay.madkhali`) has both `security_supervisor` and `security_manager` roles -- the role check passes correctly
- The filter logic is correct for internal passes but breaks for public ones

### Fix (1 file, 1 line)

**File:** `src/hooks/contractor-management/use-material-gate-passes.ts` (line 224)

Replace the simple `.neq()` with an `.or()` filter that also includes NULL values:

```typescript
// Before:
.neq("requested_by", user.id)

// After:
.or(`requested_by.neq.${user.id},requested_by.is.null`)
```

This keeps the self-approval prevention for authenticated users while correctly including public submissions where `requested_by` is NULL.

### Technical Details
- PostgREST `.neq()` uses SQL `!=` which returns NULL (not TRUE) when compared against NULL values
- The `.or()` syntax explicitly handles both cases: non-matching user IDs AND null values
- No other files need changes -- the `GatePassApprovalQueue` component already renders whatever the hook returns
