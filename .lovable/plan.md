

# Unify Admin & Portal Worker Forms — Complete Parity

## Problem

The admin form (`WorkerFormDialog.tsx` at `/contractors/workers`) is missing several features that the portal form (`ContractorWorkerForm.tsx` at `/contractor-portal/workers`) has:

| Feature | Admin Form | Portal Form |
|---------|-----------|-------------|
| Full Name (Arabic) | Yes | No |
| Project Assignment | No | Yes |
| Duplicate National ID check | No | Yes |
| Blacklist check | No | Yes |
| Medical Certificate upload | No | Yes |
| Access End Date (auto-computed) | No | Yes |
| Not Fit / Pending Medical warnings | No | Yes |
| PTW restriction warnings | No | Yes |
| DhuudPhoneInput for mobile | No | Yes |
| User Type display | N/A (admin) | Yes |

Both forms also define their own schema instead of sharing one.

## Plan

### 1. Expand shared schema — `WorkerFormSchema.ts`
Add `expiry_date` field (optional string). The portal form's local schema can be removed in favor of this shared one.

### 2. Add missing features to admin form — `WorkerFormDialog.tsx`
- Add **project selection** field (fetch projects for selected company using existing hooks)
- Add **duplicate national ID** check (reuse `useCheckDuplicateNationalId`)
- Add **medical certificate upload** section (same logic as portal form)
- Add **access end date** auto-computation from project selection
- Add **not fit / pending medical warnings** (alert when fitness status is not_fit or pending_medical)
- Add **PTW restriction warning** when PTW cert selected but worker not fit
- Use **DhuudPhoneInput** for mobile and emergency phone fields
- Add `full_name_ar` field to portal form (currently missing there)

### 3. Update portal form — `ContractorWorkerForm.tsx`
- Import and use the shared `workerFormSchema` from `WorkerFormSchema.ts` instead of local schema
- Add **Full Name (Arabic)** field (missing from portal)
- Remove the duplicated local schema definition

### 4. Ensure mutation parity — `useCreateContractorWorker`
Verify the admin create mutation passes all fields (project_id, expiry_date, medical_certificate_path, access dates) that the portal mutation already sends.

**Files to modify:** `WorkerFormSchema.ts`, `WorkerFormDialog.tsx`, `ContractorWorkerForm.tsx`

