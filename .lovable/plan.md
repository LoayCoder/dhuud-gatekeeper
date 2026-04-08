

# Worker Approval → Induction → ID/QR → Activation: Unified Lifecycle Implementation

## Current State (Problems Found)

### CRITICAL: Double Induction Send
`useSecurityApproveWorker` (line 210) calls `send-induction-video` AND then (line 228) calls `onboard-worker`, which ALSO sends an induction video internally. **Worker receives 2 WhatsApp messages.**

### CRITICAL: Project Resolution Failure  
Line 196-204 only checks `project_worker_assignments`. When no assignment exists, `projectId` stays `null`. The `send-induction-video` edge function then falls back to `projectName = 'General'` and picks a random video (wrong language).

### CRITICAL: Duplicated Induction Logic
Full induction logic (video selection, record creation, message rendering, WhatsApp send) exists in THREE places:
1. `supabase/functions/send-induction-video/index.ts` (386 lines)
2. `supabase/functions/onboard-worker/index.ts` lines 96-193
3. `supabase/functions/send-bulk-induction/index.ts` (similar pattern)

### MAJOR: Misplaced Hook
`useSendInductionVideo` in `use-worker-qr-codes.ts` (line 109-128) — induction hook in a QR file, with incomplete parameters (no projectId).

### MAJOR: No Induction Gate
Worker becomes `approved` immediately on security approval. No intermediate states like `pending_induction`. The DB has no `induction_status` column on `contractor_workers`.

### MAJOR: Raw YouTube URL Fallback
`send-induction-video` line 234-236: if no induction record is created, falls back to `video.video_url` (raw YouTube link) instead of portal URL.

---

## Implementation Plan

### Phase 1: Create Shared Induction Module

**New file: `supabase/functions/_shared/induction-sender.ts`**

Single source of truth for ALL induction logic:
- **Project resolution**: Check `project_worker_assignments` first, fall back to `contractor_workers.project_id`
- **Video selection**: Filter by worker's `preferred_language`, fall back to Arabic → English → first available
- **Induction record**: ALWAYS create BEFORE composing message
- **Portal URL**: ALWAYS use `{appUrl}/worker-induction/{inductionId}` — NEVER raw video URL
- **Message rendering**: Template lookup → localized fallback
- **WhatsApp send**: Via shared `whatsapp-provider.ts`
- **Audit log**: Record send attempt

Exports a single function: `sendInductionToWorker(supabase, { workerId, projectId?, videoId?, tenantId })`

### Phase 2: Refactor Edge Functions

**`onboard-worker/index.ts`**:
- DELETE inline induction logic (lines 96-193, ~100 lines)
- DELETE `getLocalizedInductionMessage` function
- IMPORT and CALL `sendInductionToWorker` from shared module
- Keep QR generation logic (Steps 2-3) — this is correct and unique to onboard-worker

**`send-induction-video/index.ts`**:
- REPLACE entire body with call to shared `sendInductionToWorker`
- Keep as thin wrapper (accepts request, normalizes params, delegates to shared module)
- DELETE `getLocalizedMessage` function

**`send-bulk-induction/index.ts`**:
- REPLACE per-worker induction logic with loop calling `sendInductionToWorker`

### Phase 3: Fix Frontend Approval Trigger

**`use-worker-approval-mutations.ts`**:

1. **Remove duplicate `send-induction-video` call** (lines 209-223) — `onboard-worker` already handles this
2. **Fix project resolution** (lines 193-207): Add fallback to `contractor_workers.project_id`:
   - The worker data at line 153 already selects the record — but doesn't include `project_id`
   - Add `project_id` to the select at line 153
   - Use `data.project_id` as fallback when `project_worker_assignments` returns nothing
3. **Remove `if (projectId)` guard** (line 226): Always call `onboard-worker`. If no project, still send induction (onboard-worker will handle gracefully)

### Phase 4: Clean Up Misplaced Hooks

**`use-worker-qr-codes.ts`**:
- REMOVE `useSendInductionVideo` (lines 109-128) — orphaned, incomplete, wrong file

**`WorkerDetailDialog.tsx`**:
- The manual `handleSendInduction` (line 94) calls `send-induction-video` directly — this is the RESEND path (admin manually triggers). This is legitimate but should use the `useSendInduction` hook from `use-worker-inductions.ts` instead of raw `supabase.functions.invoke`. Update to use the hook.

### Phase 5: Add Induction Status Tracking on Worker

**Database migration** — add `induction_status` column to `contractor_workers`:

```sql
ALTER TABLE contractor_workers 
ADD COLUMN induction_status text DEFAULT 'none'
CHECK (induction_status IN ('none', 'pending', 'sent', 'completed', 'expired'));
```

**Create trigger**: When `worker_inductions.status` changes to 'completed' (acknowledged), update `contractor_workers.induction_status = 'completed'`.

**Update `onboard-worker`**: After sending induction, update `contractor_workers.induction_status = 'sent'`.

### Phase 6: Security Approval ≠ Full Activation

The current system sets `approval_status = 'approved'` on security approval and that's the final state. The plan introduces induction tracking but does NOT change the existing `approval_status` enum — instead, activation is determined by `approval_status = 'approved' AND induction_status = 'completed'`.

**Frontend enforcement**:
- Worker dashboard/cards show "Pending Induction" badge when `approval_status = 'approved'` but `induction_status != 'completed'`
- QR code validation (gate guard) checks both: approved AND induction completed
- Worker list filters: add "Pending Induction" filter option

### Phase 7: Dashboard Integration

Update these to reflect induction status:
- **Worker list/table**: Show induction status badge (Pending/Sent/Completed/Expired)
- **Contractor Dashboard stats**: Add induction completion rate widget
- **Worker Detail Dialog**: Induction tab already exists — ensure it reflects real-time status
- **Quick action counts**: Include `pending_induction` count for relevant roles

---

## Files to Create
| File | Purpose |
|------|---------|
| `supabase/functions/_shared/induction-sender.ts` | Single source of truth for induction logic |
| Migration SQL | Add `induction_status` column + trigger |

## Files to Modify
| File | Change |
|------|--------|
| `supabase/functions/onboard-worker/index.ts` | Replace inline induction with shared module call |
| `supabase/functions/send-induction-video/index.ts` | Thin wrapper around shared module |
| `supabase/functions/send-bulk-induction/index.ts` | Use shared module per worker |
| `src/features/contractors/hooks/use-contractor-workers/use-worker-approval-mutations.ts` | Remove duplicate send, fix project fallback, remove guard |
| `src/features/contractors/hooks/use-worker-qr-codes.ts` | Remove misplaced `useSendInductionVideo` |
| `src/features/contractors/components/WorkerDetailDialog.tsx` | Use hook instead of raw invoke |
| `src/features/contractors/hooks/use-contractor-workers/types.ts` | Add `induction_status` field |

## Files NOT Changed
- `use-worker-inductions.ts` — Already correct (proper hook for send/resend)
- `use-worker-onboarding.ts` — Already correct (wrapper for `onboard-worker`)
- `_shared/qr-generator.ts` — Already correct
- `_shared/whatsapp-provider.ts` — Already correct

## What Gets Deleted
1. ~100 lines of inline induction logic from `onboard-worker`
2. `getLocalizedInductionMessage` from `onboard-worker`
3. `getLocalizedMessage` from `send-induction-video` (moved to shared module)
4. `useSendInductionVideo` from `use-worker-qr-codes.ts`
5. Duplicate `send-induction-video` call from security approval flow

## Anti-Recurrence Guarantee
- **One module** (`induction-sender.ts`) owns all induction logic
- **One trigger point** (`onboard-worker`) handles post-approval automation
- **No fallback to "General"** — project is always resolved or explicitly absent
- **No raw YouTube URLs** — induction record always created first, portal URL always used
- **No duplicate sends** — only `onboard-worker` triggers induction during approval

