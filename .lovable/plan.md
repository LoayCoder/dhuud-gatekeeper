

# WhatsApp Notifications Audit — What Works, What's Missing

## Current State

The project has a robust WhatsApp infrastructure: `_shared/whatsapp-provider.ts` abstracts WaSender/Twilio, and `_shared/wasender-whatsapp.ts` handles the actual API calls (correctly using `wasenderapi.com`). The recent fixes for bulk messaging, ID cards, and onboarding are confirmed working in the logs.

## What Already Has WhatsApp Notifications

| Module | Edge Function | Trigger Location | Status |
|--------|--------------|------------------|--------|
| **Incident Created** | `dispatch-incident-notification` | `incidentMutationService.ts` | Working (sends to stakeholders based on severity matrix) |
| **Incident Workflow** (approve/reject/escalate) | `send-workflow-notification` | Multiple hooks (`use-dept-rep-incident-review`, `use-dept-manager-incident-approval`, `use-clinic-review`, `use-legal-review`, `use-dispute-resolution`) | Working (sends email + WhatsApp to next actor) |
| **Gate Pass Created** | `notify-dept-rep-gate-pass` | `materialGatePassCreateService.ts` | Working (WhatsApp + email to dept rep) |
| **Public Gate Pass** | `notify-public-gate-pass` | `use-public-gate-pass.ts`, `materialGatePassActionService.ts` | Working |
| **Visitor Welcome/Badge/Host** | `send-gate-whatsapp` | `use-visit-request-*.ts` | Working |
| **Worker Bulk Message** | `send-worker-bulk-message` | Bulk action UI | Fixed (recent) |
| **Worker Onboarding/Induction** | `onboard-worker` | Onboarding flow | Fixed (recent) |
| **ID Card Send** | `send-id-card-notification` | `use-id-card-generator.ts` | Fixed (recent) |
| **HSSE Admin Notifications** | `send-hsse-notification` | `use-hsse-notifications-admin.ts` | Working |
| **Contractor Alerts** | `send-contractor-alert` | Contractor violation flow | Working |

## What's MISSING WhatsApp Notifications

| Module | Gap | Impact |
|--------|-----|--------|
| **Observation Submitted** | No `dispatch-incident-notification` or equivalent called for observations | Dept Reps / Consultants don't get WhatsApp when a new observation is filed |
| **Observation Workflow Steps** | Only HSSE-specific steps (rejection, escalation, validation) trigger `send-workflow-notification`. Steps like `pending_dept_rep_approval`, `pending_consultant_screening`, `site_client_approval` have NO WhatsApp trigger | Reviewers don't know they have pending observations |
| **Gate Pass Approval/Rejection** | `notify-dept-rep-gate-pass` only fires on creation. No WhatsApp when a gate pass is approved/rejected back to requester | Requesters don't know their pass was approved |
| **Inspection Created/Assigned** | No WhatsApp notification | Inspectors don't get notified of new assignments |
| **Action Items Assigned** | `send-action-email` sends email+WhatsApp but only when explicitly triggered | May not fire for all action assignments |

## Fix Plan

### Step 1: Add WhatsApp for Observation Submission
**File:** `src/features/incidents/services/incidentMutationService.ts`

After observation insert succeeds, invoke `dispatch-incident-notification` with `event_type: 'observation_created'` (same function already handles incident routing — extend it to handle observations).

**File:** `supabase/functions/dispatch-incident-notification/index.ts`

Add an `observation_created` event type handler that:
- Looks up the assigned dept rep or contractor consultant
- Sends bilingual WhatsApp message with observation reference + severity

### Step 2: Add WhatsApp for Observation Workflow Steps
**File:** `src/features/incidents/hooks/use-hsse-workflow/use-workflow-mutations.ts`

Add `send-workflow-notification` invocations for observation-specific status transitions (expert screening approved, dept rep approved, consultant review, etc.) — same pattern already used by incident workflow hooks.

### Step 3: Add WhatsApp for Gate Pass Approval/Rejection
**File:** `src/features/contractors/services/materialGatePassActionService.ts`

After approval/rejection status update, invoke `send-gate-whatsapp` or `send-whatsapp-notification` to notify the original requester with the decision.

### Step 4: Redeploy `dispatch-incident-notification`
After extending it to handle observation events.

## Summary

| Step | Files Changed | Effort |
|------|--------------|--------|
| 1. Observation submission WhatsApp | `incidentMutationService.ts` + `dispatch-incident-notification/index.ts` | Medium |
| 2. Observation workflow WhatsApp | `use-workflow-mutations.ts` | Small (add invoke calls) |
| 3. Gate pass decision WhatsApp | `materialGatePassActionService.ts` | Small |
| 4. Redeploy | `dispatch-incident-notification` | Trivial |

