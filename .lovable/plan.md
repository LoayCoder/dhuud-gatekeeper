

# Expanded Worker Form + RLS Fix + PTW Access Request Flow

## Overview

Rebuild the contractor portal "Add Worker" form with comprehensive fields, fix the RLS violation, improve mobile input, auto-link company, and add a PTW certification access request workflow.

---

## Problem 1: RLS Violation

The `ContractorWorkerForm.tsx` imports `useCreateContractorWorker` from `@/hooks/contractor-management` (line 12), which does NOT include `tenant_id`. The correct hook is `useContractorPortalCreateWorker` in `src/features/contractors/hooks/use-contractor-portal.ts` (line 220) which already supplies `tenant_id`. Fix: change the import to use the portal version via `@/hooks/contractor-management/index.ts` which re-exports it.

## Problem 2: Missing Database Columns

Add new columns to `contractor_workers` via migration.

## Problem 3: PTW Access Flow

When a worker has "PTW" in their training certifications, the contractor representative can request PTW platform access. This triggers an approval request to an HSSE Expert. Upon approval, the worker receives an invitation (email + WhatsApp) to access the platform as a PTW Receiver.

---

## Database Migration

Add columns to `contractor_workers`:

| Column | Type | Default |
|--------|------|---------|
| `id_type` | text | `'national_id'` |
| `date_of_birth` | date | null |
| `gender` | text | null |
| `email` | text | null |
| `emergency_contact_name` | text | null |
| `emergency_contact_phone` | text | null |
| `worker_role` | text | `'laborer'` |
| `expiry_date` | date | null |
| `fitness_to_work` | text | null |
| `training_certifications` | text[] | `'{}'` |
| `ptw_access_status` | text | null |
| `ptw_access_requested_at` | timestamptz | null |
| `ptw_access_approved_by` | uuid | null |
| `ptw_access_approved_at` | timestamptz | null |

Create a new table `ptw_access_requests`:

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK |
| `tenant_id` | uuid | NOT NULL |
| `worker_id` | uuid | FK → contractor_workers |
| `company_id` | uuid | FK → contractor_companies |
| `requested_by` | uuid | The rep who requested |
| `status` | text | pending / approved / rejected |
| `reviewed_by` | uuid | HSSE Expert who reviewed |
| `reviewed_at` | timestamptz | |
| `rejection_reason` | text | |
| `created_at` | timestamptz | default now() |

RLS policies on `ptw_access_requests`:
- SELECT: `tenant_id = get_auth_tenant_id()`
- INSERT: `tenant_id = get_auth_tenant_id()`
- UPDATE: `tenant_id = get_auth_tenant_id()` (for HSSE expert approval)

---

## File Changes

### 1. `ContractorWorkerForm.tsx` — Full Rebuild

- Fix import: use the portal-aware `useCreateContractorWorker` (from `@/hooks/contractor-management/index.ts`)
- Expand dialog to `max-w-2xl` with `ScrollArea`
- Organize into 4 sections using two-column grid:

**Personal Information**: Full Name, ID Type (National ID / Iqama / Passport), ID Number, Date of Birth, Gender, Nationality, Profile Photo (`WorkerPhotoUpload`)

**Contact Information**: Mobile Number (`DhuudPhoneInput` with SA default), Email, Emergency Contact Name, Emergency Contact Number (`DhuudPhoneInput`)

**Work Details**: Company Name (auto-filled read-only from `companyId`), Worker Role (Manager / Supervisor / Laborer / Engineer / Leader), Preferred Language, Expiry Date (auto-calculated from active project end_date), Fitness to Work (Yes / No / Optional / PTW)

**Training & Certifications**: Multi-select checkboxes (First Aid, Fire Safety, PTW, Confined Space, Working at Height). When "PTW" is selected, show a highlighted info banner: "This worker will be eligible for PTW Receiver access after approval."

### 2. `useContractorPortalCreateWorker` in `use-contractor-portal.ts`

- Expand the mutation's `data` type to include all new fields
- Pass them in the insert payload
- After successful creation, if `training_certifications` includes `'ptw'`, automatically insert a row into `ptw_access_requests` with status `'pending'`

### 3. PTW Access Request Approval UI

Create `src/components/contractor-portal/PTWAccessRequestButton.tsx`:
- Shown on worker cards that have PTW certification but no active access
- When clicked by the rep, creates a `ptw_access_requests` record
- Shows status badge (Pending / Approved / Rejected)

Create `src/components/contractors/PTWAccessApprovalList.tsx`:
- Admin/HSSE Expert view showing pending PTW access requests
- Approve/Reject actions with reason field
- On approval: updates `ptw_access_status` on the worker, triggers invitation

### 4. PTW Access Invitation (on approval)

Update or create Edge Function logic (within existing `send-contractor-invitation` or a new handler in the approval mutation):
- On HSSE Expert approval of a PTW access request:
  - Send invitation email to the worker's email using existing email infrastructure
  - Send WhatsApp notification to the worker's mobile via existing `wasender-whatsapp.ts` utility
  - Message content: "You have been approved as a PTW Receiver. Click here to access the platform."
  - Create an `invitations` record with metadata `{ type: 'ptw_receiver', worker_id, company_id }`

### 5. Workers page (`contractor-portal/Workers.tsx`)

- Pass `companyName` to the form for auto-display
- Show PTW access status badge on worker cards that have PTW certification

### 6. Update `ContractorWorkerEditForm.tsx`

- Add matching fields so edits cover the same schema

---

## PTW Access Request Flow Diagram

```text
Worker Created with PTW Certification
         │
         ▼
  ptw_access_requests row created (status: pending)
         │
         ▼
  HSSE Expert reviews in PTW Access Approval List
         │
    ┌────┴────┐
    ▼         ▼
 Approve    Reject
    │         │
    ▼         ▼
 Update    Update status
 worker    to 'rejected'
 ptw_access_status = 'approved'
    │
    ▼
 Send Email + WhatsApp invitation
 to worker as PTW Receiver
    │
    ▼
 Worker accesses platform
 via invitation link
```

---

## Technical Notes

- `DhuudPhoneInput` exists at `src/components/ui/phone-input.tsx` with SA default
- `WorkerPhotoUpload` exists at `src/features/contractors/components/WorkerPhotoUpload.tsx`
- WhatsApp sending uses `supabase/functions/_shared/wasender-whatsapp.ts`
- Email uses existing `send-contractor-invitation` Edge Function pattern
- Form uses two-column grid on desktop, single column on mobile
- Training certifications stored as PostgreSQL `text[]`, rendered as checkboxes

