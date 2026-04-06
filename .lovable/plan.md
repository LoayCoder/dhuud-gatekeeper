

# Contractor Portal: Worker Detail View Integration

## Summary
Add a worker detail modal to `/contractor-portal/workers` that reuses the existing `WorkerDetailDialog` component in view-only mode. Clicking a worker name opens the detail dialog showing all worker info (photo, details, documents, QR, induction) but with admin actions (edit, status change, delete) disabled.

## Approach

Rather than creating new `WorkerDetailView` and `WorkerDetailModal` components, we will **reuse the existing `WorkerDetailDialog`** which already has full functionality. We add a `readOnly` prop to control which actions are available.

## Changes

### 1. Update `WorkerDetailDialog.tsx` — Add `readOnly` prop
- Add optional `readOnly?: boolean` prop to the interface
- When `readOnly=true`: hide the "Quick Onboard" card, disable send induction button, hide document upload actions (show documents read-only)
- The detail view (personal info, status, QR display, induction status) remains fully visible

### 2. Update `src/pages/contractor-portal/Workers.tsx` — Add click handler + dialog
- Add `selectedWorker` state (`ContractorWorker | null`)
- Make the worker name in the table row clickable (cursor-pointer, underline on hover)
- Import and render `WorkerDetailDialog` with `readOnly={true}`
- Map the portal's `PortalWorker` type to the `ContractorWorker` type expected by the dialog (add missing fields with defaults like `tenant_id`, `company_id`, `company` from the portal context)

### 3. Type alignment
The portal uses `useContractorPortalData()` which returns workers with a subset of `ContractorWorker` fields. We need to ensure the worker object passed to `WorkerDetailDialog` includes at minimum: `id`, `tenant_id`, `company_id`, `full_name`, `full_name_ar`, `national_id`, `nationality`, `mobile_number`, `photo_path`, `preferred_language`, `approval_status`, `created_at`, `company`.

We'll cast/extend the portal worker data with company context already available from `useContractorPortalData()`.

## Technical Details

| File | Change |
|------|--------|
| `WorkerDetailDialog.tsx` | Add `readOnly` prop; conditionally hide admin actions |
| `src/pages/contractor-portal/Workers.tsx` | Add selectedWorker state, clickable name, render `WorkerDetailDialog` with `readOnly={true}` |

## What the user sees
- In `/contractor-portal/workers`, clicking a worker name opens the same detail modal used in `/contractors/workers`
- All info is visible: photo, personal details, documents, QR code, induction status
- Admin-only actions (onboard, send induction, edit) are hidden
- The portal edit button (pencil icon) remains separate for the contractor's own edit flow

