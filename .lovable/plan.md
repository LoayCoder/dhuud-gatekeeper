

# E2E Audit v9 — Observations Module

## Audit Summary

After reviewing all key files, the module is mature with 44+ fixes already applied. I found **2 remaining gaps** (1 Medium, 1 Low).

---

## Finding 1 — MEDIUM: `workflow-status-resolver.ts` missing `pending_consultant_verification`

**File:** `src/lib/workflow-status-resolver.ts` (line 31-37)

The `CONTRACTOR_CONSULTANT_STATUSES` array is missing `pending_consultant_verification`. This status is correctly handled in `current-owner.ts` (maps to "Contractor Consultant") and `InvestigationWorkflowCards.tsx` (renders `ConsultantReviewCard`), but the centralized resolver that drives `getWorkflowOwner()` and `canRoleActOnStatus()` does not include it. This means any component using the resolver will fail to identify the Contractor Consultant as the active owner for this status.

Additionally, the `getStatusDisplayLabel()` function at line 230 is missing an entry for `pending_consultant_verification`.

**Fix:** Add `'pending_consultant_verification'` to `CONTRACTOR_CONSULTANT_STATUSES` and add its display label (`{ en: 'Consultant Verification', ar: 'تحقق المستشار' }`).

---

## Finding 2 — LOW: `selectedSite` reference on line 210

**File:** `src/features/incidents/components/QuickObservationCard/hooks/useQuickObservationCardHandlers.ts` (line 210)

`selectedSite` is correctly destructured on line 17 (confirmed in code). The reference on line 210 (`selectedSite?.branch_id`) is valid. **No fix needed** — this was resolved in the v8 implementation.

---

## Implementation Plan

### Step 1: Update `workflow-status-resolver.ts`
- Add `'pending_consultant_verification'` to `CONTRACTOR_CONSULTANT_STATUSES` array (after `pending_action_dispute_review`)
- Add display label entry for `pending_consultant_verification` in `getStatusDisplayLabel()`

### Files to edit
1. `src/lib/workflow-status-resolver.ts`

