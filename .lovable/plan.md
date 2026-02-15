
# Gate Pass System End-to-End Rebuild

## Overview

A 7-phase rebuild covering both internal and public gate pass flows, fixing critical bugs, data integrity issues, and UX gaps across the entire lifecycle.

---

## Phase 1: Fix Critical Data Integrity Issues (Hooks Layer)

### 1.1 QR Verification Date Range Fix
**File:** `src/hooks/contractor-management/use-gate-pass-verification.ts`
- Add `start_date, end_date, is_public_request` to the SELECT query (line 41)
- Replace single-date check (lines 77-86) with range check using `start_date`/`end_date`, falling back to `pass_date`
- Add `is_public_request` and `start_date`/`end_date` to the `GatePassVerificationResult.gatePass` interface

### 1.2 Cancel Hook Status Update
**File:** `src/hooks/contractor-management/use-cancel-gate-pass.ts`
- Replace `cancellableStatuses` array (lines 50-54) to include: `pending_dept_approval`, `pending_contractor_approval`, `pending_club_mgmt_ack`, `pending_security_approval`, plus legacy `pending_pm_approval`, `pending_safety_approval`

### 1.3 Approval History -- New Workflow Columns
**File:** `src/hooks/contractor-management/use-my-gate-passes.ts`
- Update `useGatePassApprovalHistory` OR filter (line ~85) to include `contractor_approved_by`, `club_mgmt_ack_by`, `security_approved_by`
- Add these columns to the SELECT query
- Update the role/action mapping logic to handle new approval stages (contractor, club_mgmt, security)

### 1.4 Reference Number Race Condition
**File:** `src/hooks/contractor-management/use-material-gate-passes.ts`
- Replace client-side reference number generation (lines 322-329) with a database sequence approach using `nextval('gate_pass_ref_seq')` or a UUID-based short reference to prevent duplicates under concurrent requests
- Create a database migration to add a sequence if needed

### 1.5 Public Request Material Description Fallback
**File:** `src/hooks/public-gate-pass/use-public-gate-pass.ts`
- Before the RPC call (line 105), derive `material_description` from items when not explicitly provided:
  ```
  p_material_description: data.material_description?.trim()
    || data.items?.map(i => i.item_name).join(', ')
    || 'Materials'
  ```

---

## Phase 2: Fix Guard Verification (Critical Workflow)

### 2.1 Replace Mock Items with Real Data
**File:** `src/components/contractors/GatePassVerificationPanel.tsx`
- Remove mock items array (lines 48-58)
- Import `useGatePassItems` and `useGatePassPhotos` from `use-gate-pass-details`
- After QR scan returns a valid result, use the pass ID and `is_public_request` flag to fetch real items and photos
- Replace all `mockItems` references (lines 148, 215, 304, 312) with the real items array
- Add loading state while items are being fetched

### 2.2 Item Verification Card Photos
**File:** `src/components/contractors/gate-pass-verification/ItemVerificationCard.tsx`
- Add optional `photoUrl` prop to display the actual item photo alongside the item data
- Show thumbnail with click-to-enlarge

### 2.3 Verification Result Enhancement
**File:** `src/components/contractors/gate-pass-verification/VerificationResult.tsx`
- Add items count badge showing how many items are attached to the verified pass

---

## Phase 3: Improve Approval Queue and Dept Views

### 3.1 Public Passes in Security Dept View
**File:** `src/hooks/contractor-management/use-dept-gate-passes.ts`
- In `useDeptPendingApprovals`: add a query path for security supervisors to see public passes at `pending_security_approval` status (currently only Golf Club Mgmt stage is handled for public passes)
- Deduplicate results using a Set on pass IDs

### 3.2 Approval Queue Visual Indicators
**File:** `src/components/contractors/GatePassApprovalQueue.tsx`
- After the material description (line 170), add item count and photo indicator badges
- Use a lightweight approach: derive item count from `material_description` parsing or add a small sub-query

---

## Phase 4: Detail Dialog Hardening

**File:** `src/components/contractors/GatePassDetailDialog.tsx`

### 4.1 Vehicle Plate Structured Display
- For public passes, check for `vehicle_plate_letters` and `vehicle_plate_numbers` fields and display them in structured Saudi plate format instead of the raw combined field

### 4.2 Photo Lightbox
- Replace the current `<a href target="_blank">` pattern for photos (lines 452-455) with a Dialog-based lightbox (similar to what PublicStatusPage already uses)
- Show full-size image in a modal with item name overlay

### 4.3 Serial Number Display
- Show `sr_number` field for public pass items (already partially supported in the interface but not rendered in the items list)

---

## Phase 5: Public Flow Polish

### 5.1 Public Request Page -- Review Step Enhancement
**File:** `src/pages/public-gate-pass/PublicRequestPage.tsx`
- Add item photo thumbnails to the review/confirmation step before final submission
- Show a summary of all uploaded photos with the ability to go back and edit

### 5.2 Public Status Page Refinements
**File:** `src/pages/public-gate-pass/PublicStatusPage.tsx`
- Add loading spinner on the refresh button during refetch (currently no visual feedback)
- The photo display currently uses raw public bucket URLs (line 408). Since the bucket may be private, switch to signed URLs with a helper function that generates them after the RPC data loads

### 5.3 Photo Upload Retry
**File:** `src/hooks/public-gate-pass/use-public-gate-pass.ts`
- Add simple retry logic (1 retry) for photo upload failures before submission

---

## Phase 6: Internal Create Wizard Enhancement

**File:** `src/components/contractors/gate-pass-create/GatePassCreateWizard.tsx`

### 6.1 Pass Type Visibility
- Ensure the `PassTypeSelector` shows all 3 types (`in`, `out`, `in_out`) with clear labels and descriptions visible to the user

### 6.2 Date Range Support
- Add end date picker for multi-day passes (currently only single `passDate` is used)
- Wire `start_date` and `end_date` to the create mutation

### 6.3 Submission Confirmation
- Add a confirmation dialog before final submit showing a summary of the pass details

---

## Phase 7: Photo Integrity and Unified Media Layer

### 7.1 Create Unified Media Hook
**New file:** `src/hooks/contractor-management/use-gate-pass-media.ts`

Single hook replacing direct `useGatePassItems` + `useGatePassPhotos` calls:
```
useGatePassMedia(passId, isPublic?)
  Returns: { items, photos, photoCount, itemCount, isLoading, refreshMedia }
```

- Detects `isPublic` to query the correct table and bucket
- Generates signed URLs with 10-minute TTL tracking
- Exposes `refreshMedia()` to regenerate expired signed URLs
- Coordinates loading states between items and photos queries

### 7.2 Replace All Consumers
- `GatePassDetailDialog.tsx`: Replace 2 hooks with `useGatePassMedia`
- `GatePassVerificationPanel.tsx`: Use `useGatePassMedia` instead of mock data
- `use-gate-pass-pdf.ts`: Pass `isPublic` flag correctly

### 7.3 Reusable Photo Component
**New file:** `src/components/ui/gate-pass-photo.tsx`
- Accepts `signedUrl`, `alt`, `className`
- Shows skeleton loader while image loads
- Shows placeholder icon on error with retry button
- Click-to-enlarge lightbox using Dialog
- Used across Detail Dialog, Verification Panel, and Public Status Page

### 7.4 Signed URL Expiry Handling
- Track `urlGeneratedAt` timestamp in `useGatePassMedia`
- Auto-refresh when dialog opens or when URLs are older than 10 minutes
- On image load 403 error, trigger single auto-retry of URL generation

### 7.5 Tenant Isolation
- Existing RLS policies on `gate_pass_items`, `public_gate_pass_items`, and storage buckets enforce tenant isolation
- Add explicit client-side validation in `useGatePassMedia`: verify returned data's tenant matches the user's tenant before returning

### 7.6 PDF Export Fix
**File:** `src/hooks/contractor-management/use-gate-pass-pdf.ts`
- Pass `isPublic` derived from `passDetails?.is_public_request` to the items/photos queries

### 7.7 Deprecate Old Hooks
**File:** `src/hooks/contractor-management/use-gate-pass-details.ts`
- Add `@deprecated Use useGatePassMedia instead` JSDoc to `useGatePassItems` and `useGatePassPhotos`
- Keep them functional for backward compatibility

### 7.8 Export New Hook
**File:** `src/hooks/contractor-management/index.ts`
- Add `export * from "./use-gate-pass-media"`

---

## Database Migration (Phase 1.4 only)

A single migration to create a sequence for gate pass reference numbers:
```sql
CREATE SEQUENCE IF NOT EXISTS gate_pass_ref_seq START 1;
```

No other schema changes are required across all 7 phases.

---

## Files Summary

| # | File | Action | Phase |
|---|------|--------|-------|
| 1 | `src/hooks/contractor-management/use-gate-pass-verification.ts` | Modify | 1 |
| 2 | `src/hooks/contractor-management/use-cancel-gate-pass.ts` | Modify | 1 |
| 3 | `src/hooks/contractor-management/use-my-gate-passes.ts` | Modify | 1 |
| 4 | `src/hooks/contractor-management/use-material-gate-passes.ts` | Modify | 1 |
| 5 | `src/hooks/public-gate-pass/use-public-gate-pass.ts` | Modify | 1, 5 |
| 6 | `src/components/contractors/GatePassVerificationPanel.tsx` | Modify | 2, 7 |
| 7 | `src/components/contractors/gate-pass-verification/ItemVerificationCard.tsx` | Modify | 2 |
| 8 | `src/components/contractors/gate-pass-verification/VerificationResult.tsx` | Modify | 2 |
| 9 | `src/hooks/contractor-management/use-dept-gate-passes.ts` | Modify | 3 |
| 10 | `src/components/contractors/GatePassApprovalQueue.tsx` | Modify | 3 |
| 11 | `src/components/contractors/GatePassDetailDialog.tsx` | Modify | 4, 7 |
| 12 | `src/pages/public-gate-pass/PublicRequestPage.tsx` | Modify | 5 |
| 13 | `src/pages/public-gate-pass/PublicStatusPage.tsx` | Modify | 5 |
| 14 | `src/components/contractors/gate-pass-create/GatePassCreateWizard.tsx` | Modify | 6 |
| 15 | `src/hooks/contractor-management/use-gate-pass-media.ts` | **New** | 7 |
| 16 | `src/components/ui/gate-pass-photo.tsx` | **New** | 7 |
| 17 | `src/hooks/contractor-management/use-gate-pass-pdf.ts` | Modify | 7 |
| 18 | `src/hooks/contractor-management/use-gate-pass-details.ts` | Modify | 7 |
| 19 | `src/hooks/contractor-management/index.ts` | Modify | 7 |

## Risk Assessment

| Phase | Risk | Notes |
|-------|------|-------|
| 1 | Low | Query and validation fixes, no schema changes (except optional sequence) |
| 2 | Medium | Changes guard verification workflow -- requires QR scan testing |
| 3 | Low | Additive query changes with deduplication |
| 4 | Low | UI enhancements only |
| 5 | Low | Public page polish, signed URL improvement |
| 6 | Low | Wizard UI enhancements |
| 7 | Medium | Touches all photo consumers -- requires thorough cross-flow testing |
