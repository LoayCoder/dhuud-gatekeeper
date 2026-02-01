# Action Visibility State Machine - Audit Report

**Date:** 2026-02-12
**Auditor:** Jules (Senior Supabase Architect)
**Status:** FAILED

## Executive Summary
The audit of the `dhuud-gatekeeper` codebase reveals critical failures in all 4 checkpoints regarding the "Action Visibility State Machine". The implementation does not match the proposed design, and a critical security vulnerability was identified.

---

## Detailed Findings

### 1. The "Email Race Condition" Check
**Status: FAIL**
**Target:** `src/hooks/use-investigation.ts`
**Findings:**
The frontend explicitly triggers an email function immediately upon saving an action for Observations.
- **File:** `src/hooks/use-investigation.ts`
- **Location:** Inside `useCreateCorrectiveAction` hook.
- **Evidence:**
  ```typescript
  const isObservation = incident?.event_type === 'observation';
  if (action.assigned_to && isObservation) {
    // ...
    await supabase.functions.invoke('send-action-email', { ... });
  }
  ```
- **Violation:** The frontend triggers the email directly, violating the requirement for server-side only triggering upon status transition.

### 2. RLS Visibility Logic
**Status: FAIL**
**Target:** `supabase/migrations/20260114194257_9bb2635b-adbe-4677-b74a-99014a28a92f.sql`
**Findings:**
The Row Level Security (RLS) policies do not implement the "Hidden Steps" logic. Actions are visible immediately upon creation.
- **File:** `supabase/migrations/20260114194257_9bb2635b-adbe-4677-b74a-99014a28a92f.sql`
- **Policy:** `"Branch-isolated view corrective_actions"`
- **Evidence:**
  ```sql
  CREATE POLICY "Branch-isolated view corrective_actions"
  ON public.corrective_actions FOR SELECT TO authenticated
  USING (
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE user_id = auth.uid())
    AND (branch_id IS NULL OR public.can_access_branch(auth.uid(), branch_id))
    AND deleted_at IS NULL
  );
  ```
- **Violation:** The policy allows access based solely on Tenant/Branch ID. It completely ignores the `released_at` column (added in `20251212...`) and the parent incident's status.

### 3. Client-Side Auth Vulnerability
**Status: FAIL (CRITICAL)**
**Target:** `src/components/support/AdminTicketDetail.tsx`
**Findings:**
A critical security risk was identified where the `supabase.auth.admin` API is being used on the client-side.
- **File:** `src/components/support/AdminTicketDetail.tsx`
- **Evidence:**
  ```typescript
  const { data, error } = await supabase.auth.admin.getUserById(ticket.created_by);
  ```
- **Violation:** Exposes administrative privileges to the client browser. This logic must be moved to an Edge Function immediately.

### 4. Offline Sync ID Integrity
**Status: FAIL**
**Target:** `src/hooks/use-offline-report-queue.ts`
**Findings:**
Offline entities use a custom, non-standard ID generation method instead of UUID v4, posing a high risk of sync conflicts and database validation errors.
- **File:** `src/hooks/use-offline-report-queue.ts`
- **Evidence:**
  ```typescript
  const reportId = `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  ```
- **Violation:** IDs are generated as custom strings, not UUIDs. This will fail if the database expects a UUID type for the Primary Key, and causes "Sync Conflict Risk".

---

## Recommendations
1.  **Refactor Email Trigger:** Remove the client-side `send-action-email` call in `use-investigation.ts`. Implement a Database Trigger or Edge Function hook that listens for `incidents.status` changes (to "released" or "approved") to send emails.
2.  **Update RLS:** Modify the `corrective_actions` RLS policy to explicitly check `released_at IS NOT NULL` (or equivalent logic).
3.  **Secure Auth:** Remove `supabase.auth.admin` from `AdminTicketDetail.tsx`. Create a secure Edge Function for fetching user details that validates the caller's permissions.
4.  **Fix ID Generation:** Replace the custom ID generation in `use-offline-report-queue.ts` with `self.crypto.randomUUID()` or a library like `uuid` to generate compliant v4 UUIDs.
