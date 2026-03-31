

# QA Audit Report: Action Management Workflow

## Verification Checklist

### 1. Functional Validation (UI + UX)

| Check | Status | Issue |
|-------|--------|-------|
| Action card click → opens details | ✅ PASS | `setSelectedActionDetail` wired correctly |
| Start Work button → opens dialog | ✅ PASS | Opens `ActionWorkflowDialog` in `start` mode |
| Submit for Verification → opens dialog | ✅ PASS | Opens `ActionWorkflowDialog` in `complete` mode |
| Verify & Close button | ✅ PASS | Inline in `ActionDetailSheet` |
| Return for Correction button | ✅ PASS | Requires mandatory notes |
| Calendar/Extension button | ✅ PASS | Opens `ExtensionRequestDialog` |
| Loading states | ✅ PASS | Skeleton loaders in `ActionsTab` |
| Empty state | ✅ PASS | "No Actions Assigned" card |
| `isSubmitting` always false in layout | ⚠️ **MEDIUM** | `MyActionsLayout.tsx` line 186: `isSubmitting={false}` hardcoded — the submit button in `ActionWorkflowDialog` never shows spinner |

### 2. Evidence & Submission Validation

| Check | Status | Issue |
|-------|--------|-------|
| Upload photos in workflow dialog | ✅ PASS | File input accepts `image/*,.pdf,.doc,.docx` |
| Upload via ActionEvidenceSection | ✅ PASS | Drag-and-drop with `react-dropzone`, 10MB limit |
| Multiple attachments | ✅ PASS | Both dialog and evidence section support multiple |
| File preview/download | ✅ PASS | Links via `getPublicUrl` |
| Required field validation (completion notes) | ✅ PASS | Button disabled when `!notes.trim()` in complete mode |
| Evidence section `sessionId` fallback | ⚠️ **MEDIUM** | `ActionDetailSheet` line 237: `sessionId={action.session_id \|\| action.incident_id}` — for incident actions, `incident_id` is correct. But `ActionEvidenceSection` line 32 uses this as `incidentId` for audit logs. For inspection actions without `incident_id`, it falls back to `sessionId` which is OK. |
| `audit-evidence` bucket public access | ⚠️ **MEDIUM** | `getPublicUrl` is used (line 63 of `ActionEvidenceSection`) — if bucket is not public, URLs will 403. Need to verify bucket is public or switch to `createSignedUrl`. |

### 3. Workflow Integrity (End-to-End)

| Check | Status | Issue |
|-------|--------|-------|
| assigned → in_progress | ✅ PASS | `handleActionDialogConfirm` calls correct mutation |
| in_progress → completed | ✅ PASS | Sets `completed_date`, `completion_notes` |
| completed → closed (verify) | ✅ PASS | `useVerifyAction` sets `verified_by`, `verified_at` |
| completed → returned_for_correction | ✅ PASS | Increments `return_count`, sets `last_return_reason` |
| returned_for_correction → in_progress | ✅ PASS | `canStart` includes `returned_for_correction` |
| Status skip prevention | ⚠️ **HIGH** | **No server-side guard** — the DB update uses `.eq('id', id)` without checking current status. A user could theoretically call the mutation with any status transition (e.g., `assigned` → `closed`). No DB trigger enforces valid transitions for corrective actions. |
| Self-approval prevention | ⚠️ **HIGH** | **No check** — the `useVerifyAction` mutation does not verify that `user.id !== action.assigned_to`. An assignee can open the detail sheet and click "Verify & Close" on their own action. The verification buttons are shown to ALL users viewing a `completed` action, not just inspectors/reviewers. |
| `getMyCorrectiveActions` released_at filter | ⚠️ **MEDIUM** | Line 234-238: Incident actions are filtered by `released_at !== null` — if an action hasn't been "released" yet, it won't appear in My Actions even if assigned. This could cause "missing action" confusion. |

### 4. Backend & Database Validation

| Check | Status | Issue |
|-------|--------|-------|
| Incident actions query | ✅ PASS | Filters by `assigned_to`, `tenant_id`, `deleted_at IS NULL` |
| Inspection actions query | ✅ PASS | Same filters plus `session_id IS NOT NULL` |
| Status updates persist | ✅ PASS | Both mutations update correctly |
| Missing `source_type` in incident query | ⚠️ **LOW** | `getMyCorrectiveActions` doesn't select `source_type`, `session_id`, `started_at`, `progress_notes`, `completion_notes`, `overdue_justification`, `verified_by`, `verified_at`, `verification_notes`. The `ActionDetailSheet` shows these fields but they'll be `undefined` for incident-sourced actions. |
| Missing fields in inspection query | ⚠️ **LOW** | `useMyInspectionActions` doesn't select `overdue_justification`. |
| `throwOnError()` not used | ⚠️ **HIGH** | Per project memory (`forced-rls-error-reporting`), all insert/update chains must include `.throwOnError()`. Neither `updateMyActionStatus`, `useUpdateInspectionActionStatus`, nor `useVerifyAction` use `.throwOnError()` — RLS rejections could silently succeed with empty results. |

### 5. Security & Data Isolation

| Check | Status | Issue |
|-------|--------|-------|
| Tenant isolation on queries | ✅ PASS | All queries filter by `tenant_id` |
| RLS on `corrective_actions` | ✅ PASS | Assumed via DB policies |
| Role-based verification gate | ❌ **HIGH** | **No RPC permission check** before showing "Verify & Close" / "Return for Correction" buttons. `ActionDetailSheet` shows these to ANY authenticated user viewing a `completed` action. Should be gated by role check (inspector, HSSE officer, or action creator). |
| Self-closure prevention | ❌ **HIGH** | See item 3 above — no `assigned_to !== user.id` check |
| Extension request RLS | ✅ PASS | Uses `tenant_id` filter |

### 6. Notifications Validation

| Check | Status | Issue |
|-------|--------|-------|
| Action assignment email | ✅ PASS | `useCreateActionFromFinding` sends via `send-action-email` |
| Verification/closure email | ✅ PASS | `useVerifyAction` sends `action_closed` email |
| Rejection email | ✅ PASS | `useVerifyAction` sends `action_returned` email |
| Start Work notification | ❌ MISSING | No notification sent when assignee starts work |
| Submit for Verification notification | ❌ **MEDIUM** | No notification sent to reviewer when assignee submits. The reviewer has no way to know an action is ready for review except by manually checking. |
| Extension request notification | ❌ **MEDIUM** | No notification to HSSE expert when extension is requested |
| WhatsApp/Push notifications | ❌ MISSING | Only email notifications implemented for actions |

### 7. Silent Failure Detection

| Check | Status | Issue |
|-------|--------|-------|
| `isSubmitting` hardcoded false | ⚠️ **MEDIUM** | `ActionWorkflowDialog` receives `isSubmitting={false}` always — user can double-click submit |
| Evidence upload errors swallowed | ⚠️ **LOW** | In `handleActionDialogConfirm` line 128-129: `catch (error) { // handled by mutation hooks }` — if upload fails but status update succeeds, partial state results |
| Dialog closes before mutation completes | ⚠️ **MEDIUM** | `handleActionDialogConfirm` line 100: `setActionDialogOpen(false)` happens BEFORE the async mutations. If mutation fails, dialog is already closed and user sees only a toast. |
| `useVerifyAction` no query invalidation for `my-corrective-actions` | ⚠️ **MEDIUM** | After verification, only inspection-related query keys are invalidated. Incident actions won't refresh — the closed action will still appear as `completed` until manual refresh. |

### 8. Performance & Stability

| Check | Status | Issue |
|-------|--------|-------|
| Realtime subscription | ✅ PASS | Channel subscribes to `corrective_actions` changes |
| Optimistic updates | ✅ PASS | Both incident and inspection mutations have optimistic updates |
| Rollback on error | ✅ PASS | Context-based rollback in both mutations |

---

## Issues Summary (Sorted by Risk)

### HIGH Risk

| # | Issue | Component | Fix |
|---|-------|-----------|-----|
| H1 | **No role-based gate on verification buttons** — any user can verify/reject any completed action | `ActionDetailSheet.tsx` | Add RPC permission check or at minimum check if current user is inspector/creator of the session/incident before showing verify buttons |
| H2 | **No self-approval prevention** — assignee can verify their own action | `ActionDetailSheet.tsx` + `useVerifyAction` | Check `user.id !== action.assigned_to` both client-side (hide buttons) and server-side (in mutation) |
| H3 | **No server-side status transition guard** — any valid status can be set regardless of current status | `updateMyActionStatus`, `useUpdateInspectionActionStatus` | Add a DB trigger or RPC that validates `old.status → new.status` transitions |
| H4 | **Missing `.throwOnError()`** on insert/update chains — RLS rejections silently succeed | All mutation service functions | Add `.throwOnError()` to all Supabase `.update()` and `.insert()` chains |

### MEDIUM Risk

| # | Issue | Component | Fix |
|---|-------|-----------|-----|
| M1 | `isSubmitting` hardcoded `false` in layout | `MyActionsLayout.tsx:186` | Pass actual submitting state from `submittingActionIds` |
| M2 | Dialog closes before mutations complete | `useMyActions.ts:100` | Move `setActionDialogOpen(false)` to after mutation success |
| M3 | No "Submit for Verification" notification to reviewer | `useUpdateInspectionActionStatus`, `updateMyActionStatus` | Add email notification to inspector/session creator when status changes to `completed` |
| M4 | `useVerifyAction` doesn't invalidate `my-corrective-actions` query | `use-action-mutations.ts:177` | Add `queryClient.invalidateQueries({ queryKey: ['my-corrective-actions'] })` |
| M5 | Missing fields in `getMyCorrectiveActions` select | `incidentQueryService.ts:220` | Add `started_at, progress_notes, completion_notes, overdue_justification, verified_by, verified_at, verification_notes, session_id, source_type` to select |
| M6 | `audit-evidence` bucket may not be public | `ActionEvidenceSection.tsx:63` | Verify bucket is public or use `createSignedUrl` instead of `getPublicUrl` |

### LOW Risk

| # | Issue | Component | Fix |
|---|-------|-----------|-----|
| L1 | No WhatsApp/Push notifications for action workflow | — | Future enhancement |
| L2 | No "Start Work" notification | — | Optional — low priority |
| L3 | Missing `overdue_justification` in inspection actions query | `use-action-queries.ts` | Add to select clause |

---

## Implementation Plan

### Phase 1: Critical Security Fixes (H1-H4)

**File 1: `ActionDetailSheet.tsx`**
- Add `useAuth()` to get current user
- Hide verification UI if `user.id === action.assigned_to` (prevent self-approval)
- Add role check: only show verify buttons if user has inspector/HSSE role (use `has_role_by_code` RPC or check if user is the session creator)

**File 2: `use-action-mutations.ts` (`useVerifyAction`)**
- Add server-side check: fetch action's `assigned_to` and reject if `user.id === assigned_to`
- Add `queryClient.invalidateQueries({ queryKey: ['my-corrective-actions'] })` in `onSuccess`

**File 3: `incidentQueryService.ts` (`updateMyActionStatus`)**
- Add `.throwOnError()` to the update chain
- Add current status validation: fetch current status before update, reject invalid transitions

**File 4: `use-action-mutations.ts` (`useUpdateInspectionActionStatus`)**
- Add `.throwOnError()` to the update chain

### Phase 2: Silent Failure & UX Fixes (M1-M5)

**File 5: `MyActionsLayout.tsx`**
- Pass `isSubmitting={submittingActionIds.has(actionDialogAction?.id || '')}` instead of `false`

**File 6: `useMyActions.ts`**
- Move `setActionDialogOpen(false)` into the `try` block after mutations succeed (not before)

**File 7: `incidentQueryService.ts` (`getMyCorrectiveActions`)**
- Add missing fields to select: `started_at, progress_notes, completion_notes, overdue_justification, verified_by, verified_at, verification_notes, session_id, source_type`

### Phase 3: Notifications (M3)

**File 8: `updateMyActionStatus` / `useUpdateInspectionActionStatus`**
- When status changes to `completed`, send email to the action creator/inspector notifying them that the action is ready for verification

---

## Final Assessment

| Criterion | Status |
|-----------|--------|
| Fully functional | ⚠️ Functional but with gaps |
| No silent failures | ❌ Multiple silent failure paths (H4, M1, M2) |
| Secure and isolated | ❌ Missing role gates and self-approval prevention (H1, H2) |
| Ready for production | ❌ Not until H1-H4 and M1-M4 are resolved |

**Recommendation**: Implement Phase 1 (security) and Phase 2 (reliability) before production deployment. Phase 3 (notifications) can follow as enhancement.

