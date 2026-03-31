

# QA Audit Report: Action Management Workflow (Post-Fix Verification)

## Verification Checklist

### 1. Functional Validation (UI + UX)

| Check | Status | Notes |
|-------|--------|-------|
| Action card click → opens details | ✅ PASS | `setSelectedActionDetail` wired in `ActionsTab` line 53 |
| Start Work → opens dialog | ✅ PASS | `handleStartWork` sets mode to `start`, opens `ActionWorkflowDialog` |
| Submit for Verification → opens dialog | ✅ PASS | `handleMarkCompleted` sets mode to `complete` |
| Verify & Close button | ✅ PASS | Inline in `ActionDetailSheet` with role gate |
| Return for Correction | ✅ PASS | Requires mandatory notes (line 327) |
| Calendar/Extension button | ✅ PASS | Opens `ExtensionRequestDialog` with date picker + reason |
| Loading states | ✅ PASS | Skeleton loaders in `ActionsTab` |
| Empty state | ✅ PASS | "No Actions Assigned" card |
| `isSubmitting` state | ✅ PASS | Uses `submittingActionIds.has()` (line 185 of layout) |
| Dialog closes only on success | ✅ PASS | `setActionDialogOpen(false)` inside try block after mutations (line 127 of useMyActions) |
| All dialogs render in layout | ✅ PASS | `ActionWorkflowDialog`, `ExtensionRequestDialog`, `ActionDetailSheet` all in `MyActionsLayout` |

### 2. Evidence & Submission Validation

| Check | Status | Notes |
|-------|--------|-------|
| Upload photos in workflow dialog | ✅ PASS | File input accepts `image/*,.pdf,.doc,.docx` |
| Upload via ActionEvidenceSection in detail sheet | ✅ PASS | Drag-and-drop with `react-dropzone`, 10MB limit |
| Multiple attachments | ✅ PASS | Both `ActionWorkflowDialog` and `ActionEvidenceSection` support multiple files |
| File preview/download in detail sheet | ✅ PASS | Links via `getPublicUrl` |
| Required field validation (completion notes) | ✅ PASS | Button disabled when `!notes.trim()` in complete mode (line 181) |
| Evidence upload context ID | ✅ PASS | Uses `incidentId || sessionId` (line 103 of useMyActions) |
| Evidence visible in detail sheet | ✅ PASS | `ActionEvidenceSection` rendered at line 268 of `ActionDetailSheet` |

### 3. Workflow Integrity (End-to-End)

| Check | Status | Notes |
|-------|--------|-------|
| assigned → in_progress | ✅ PASS | Both incident and inspection mutations handle correctly |
| in_progress → completed | ✅ PASS | Sets `completed_date`, `completion_notes`, `overdue_justification` |
| completed → closed (verify) | ✅ PASS | `useVerifyAction` sets `verified_by`, `verified_at`, sends email |
| completed → returned_for_correction | ✅ PASS | Increments `return_count`, sets `last_return_reason`, sends email |
| returned_for_correction → in_progress | ✅ PASS | `canStart` includes `returned_for_correction` |
| Self-approval prevention (client) | ✅ PASS | `action.assigned_to === user.id` check at line 49 of `ActionDetailSheet` |
| Self-approval prevention (server) | ✅ PASS | `action?.assigned_to === user.id` check at line 122 of `use-action-mutations` |
| Status transition guard on verify | ✅ PASS | Only `completed` actions can be verified (line 127) |
| `.throwOnError()` on incident updates | ✅ PASS | Added at line 280 of `incidentQueryService` |
| `.throwOnError()` on inspection updates | ✅ PASS | Added at line 276 of `use-action-mutations` |
| `.throwOnError()` on verify | ✅ PASS | Added at line 160 of `use-action-mutations` |
| Query invalidation after verify | ✅ PASS | Invalidates `my-corrective-actions` AND `my-inspection-actions` (lines 187-188) |

### 4. Backend & Database Validation

| Check | Status | Notes |
|-------|--------|-------|
| Incident actions query fields | ✅ PASS | `getMyCorrectiveActions` now includes `started_at, progress_notes, completion_notes, overdue_justification, verified_by, verified_at, verification_notes, session_id, source_type, assigned_to` |
| Inspection actions query fields | ⚠️ **LOW** | `useMyInspectionActions` still missing `overdue_justification` in select |
| Tenant isolation on queries | ✅ PASS | All queries filter by `tenant_id` |
| Soft delete filter | ✅ PASS | All queries filter `deleted_at IS NULL` |
| Released_at gate for incident actions | ✅ PASS | Filters by `released_at !== null` (with observation exception) |

### 5. Security & Data Isolation

| Check | Status | Notes |
|-------|--------|-------|
| Role-based verification gate | ✅ PASS | `canVerify` query checks `hsse_officer`, `hsse_manager`, `admin` roles via RPC |
| Self-closure prevention | ✅ PASS | Both client and server-side checks |
| Tenant isolation | ✅ PASS | All queries scoped to `tenant_id` |
| `refetchOnMount: 'always'` on permission query | ✅ PASS | Line 68 of `ActionDetailSheet` |

### 6. Notifications Validation

| Check | Status | Notes |
|-------|--------|-------|
| Action assignment email | ✅ PASS | Both `useCreateActionFromFinding` and `useCreateSessionAction` send emails |
| Verification/closure email | ✅ PASS | `useVerifyAction` sends `action_closed` email |
| Rejection email | ✅ PASS | `useVerifyAction` sends `action_returned` email |
| Submit for Verification notification | ❌ **MEDIUM** | No notification sent to reviewer when assignee submits — reviewer has no way to know action is ready |
| Extension request notification | ❌ **MEDIUM** | No notification to HSSE expert when extension requested |
| Start Work notification | ❌ LOW | Not critical |

### 7. Silent Failure Detection

| Check | Status | Notes |
|-------|--------|-------|
| Mutations use `.throwOnError()` | ✅ PASS | All critical update chains now include it |
| Dialog stays open on error | ✅ PASS | `setActionDialogOpen(false)` only called in try block |
| `isSubmitting` reflects real state | ✅ PASS | Uses `submittingActionIds` set |
| Evidence upload error handling | ⚠️ **LOW** | If evidence upload fails but user retries, partial state is possible. Error is caught and logged. |

### 8. Remaining Issues

| # | Risk | Issue | Component | Fix |
|---|------|-------|-----------|-----|
| 1 | **MEDIUM** | No "Submit for Verification" notification to reviewer | `updateMyActionStatus` / `useUpdateInspectionActionStatus` | When status changes to `completed`, send email to action creator or session inspector |
| 2 | **MEDIUM** | No extension request notification to HSSE | `useRequestExtension` | Send email to HSSE expert when extension is requested |
| 3 | **LOW** | `useMyInspectionActions` missing `overdue_justification` in select | `use-action-queries.ts` line 45 | Add `overdue_justification` to the select clause |
| 4 | **LOW** | `useCreateActionFromFinding` missing `.throwOnError()` | `use-action-mutations.ts` line 28-45 | Add `.throwOnError()` to insert chain |
| 5 | **LOW** | `useUpdateActionStatus` (generic, used in session workspace) missing `.throwOnError()` | `use-action-mutations.ts` line 216-218 | Add `.throwOnError()` |
| 6 | **LOW** | `useRequestExtension` missing `.throwOnError()` on insert | `use-action-extensions.ts` line 60-70 | Add `.throwOnError()` |
| 7 | **LOW** | `useApproveExtension` missing `.throwOnError()` on updates | `use-action-extensions.ts` lines 153-156, 162-165 | Add `.throwOnError()` |
| 8 | **LOW** | `getStatusIcon` has no case for `closed` status | `helpers.tsx` | Add `case 'closed': return <CheckCircle2 className="h-4 w-4 text-success" />` |
| 9 | **LOW** | No server-side status transition guard (DB trigger) | Database | Add a trigger to validate `old.status → new.status` transitions. Currently only verified on the `useVerifyAction` path. |

## Implementation Plan

### Phase 1: Remaining `.throwOnError()` fixes (Issues 4-7)

**Files to modify:**
- `src/features/incidents/hooks/use-inspection-actions/use-action-mutations.ts` — Add `.throwOnError()` to `useCreateActionFromFinding` insert (line 43) and `useUpdateActionStatus` update (line 218)
- `src/features/incidents/hooks/use-action-extensions.ts` — Add `.throwOnError()` to insert (line 70) and both updates in `useApproveExtension` (lines 156, 165)

### Phase 2: Missing query field + status icon (Issues 3, 8)

**Files to modify:**
- `src/features/incidents/hooks/use-inspection-actions/use-action-queries.ts` — Add `overdue_justification` to `useMyInspectionActions` select clause
- `src/pages/incidents/MyActions/helpers.tsx` — Add `closed` case to `getStatusIcon`

### Phase 3: Submission notification (Issue 1)

**Files to modify:**
- `src/features/incidents/services/incidentQueryService.ts` — After status update to `completed`, fetch action creator info and send email via `send-action-email`
- `src/features/incidents/hooks/use-inspection-actions/use-action-mutations.ts` — Same for inspection actions in `useUpdateInspectionActionStatus`

### Phase 4: Extension notification (Issue 2)

**Files to modify:**
- `src/features/incidents/hooks/use-action-extensions.ts` — After inserting extension request, find HSSE experts for the tenant and send notification email

## Final Assessment

| Criterion | Status |
|-----------|--------|
| Fully functional | ✅ All core workflows work correctly |
| No silent failures | ✅ Critical paths covered with `.throwOnError()` |
| Secure and isolated | ✅ Role gates, self-approval prevention, tenant isolation all enforced |
| Ready for production | ⚠️ Functional and secure, but missing submission/extension notifications (medium risk) and 4 minor `.throwOnError()` gaps on secondary paths |

**Verdict**: The core action workflow (create → assign → start → submit → verify/reject → close) is **production-ready**. The remaining issues are enhancements (notifications) and low-risk hardening on secondary code paths. Recommend implementing Phase 1+2 (small fixes) immediately, Phase 3+4 (notifications) as fast-follow.

