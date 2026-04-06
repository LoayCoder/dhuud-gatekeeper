
Fix the contractor representative ID card photo flow in the actual save path and the actual preview path.

What is broken now
- The attached preview is showing the fallback placeholder, not the uploaded photo.
- `IDCardPreviewDialog` and the card generator already support photos, but only when `personData.photo` is provided.
- In `src/features/contractors/components/CompanyDetailDialog.tsx`, `getSiteRepPersonData()` does not pass any photo at all, so the contractor representative ID card always falls back to initials.
- The company form still saves through `useSyncPersonnelToWorkers()` from `CompanyFormDialog.tsx`. In that hook, the `contractor_representatives` update/insert still omits `photo_path`, so saving the company clears the representative photo from the main representative record. That is why reopening Edit shows no photo.

Implementation plan

1. Fix representative persistence in the real save flow
- File: `src/features/contractors/hooks/use-sync-personnel-to-workers.ts`
- Add these fields to the `contractor_representatives` update/insert payload:
  - `photo_path: siteRep.photo_path || null`
  - `nationality: siteRep.nationality || null`
  - `phone: siteRep.phone || null`
- Keep the existing `contractor_workers.photo_path` sync.

2. Fix representative typing/query for safe UI access
- File: `src/features/contractors/hooks/use-contractor-site-rep.ts`
- Replace `select("*")` with an explicit select list.
- Extend `ContractorSiteRep` to include:
  - `photo_path`
  - `phone`
  - `nationality`
  - optionally `full_name_ar`
- This avoids relying on hidden fields and makes the photo available cleanly to the dialog.

3. Pass a real photo URL into the ID card preview
- File: `src/features/contractors/components/CompanyDetailDialog.tsx`
- Add signed URL loading for the representative photo from the `worker-photos` bucket.
- Store that signed URL in local state.
- Update `getSiteRepPersonData()` to pass:
  - `photo: siteRepPhotoUrl || undefined`
  - optionally `fullNameAr` if available
- No change is needed in `IDCardPreviewDialog` or the ID card templates, because they already render the photo correctly once `personData.photo` is set.

4. Optional same-pass parity fix
- Safety officer ID cards use the same pattern and currently also do not pass photo data from `CompanyDetailDialog`.
- If we want complete consistency, extend safety officer photo mapping in the same change.

Files
- `src/features/contractors/hooks/use-sync-personnel-to-workers.ts`
- `src/features/contractors/hooks/use-contractor-site-rep.ts`
- `src/features/contractors/components/CompanyDetailDialog.tsx`
- Optional: `src/features/contractors/hooks/use-contractor-safety-officers.ts`

Expected result
- Upload representative photo, save, reopen edit: photo remains saved.
- Open Contractor Representative ID card preview: real photo appears.
- Download / print / WhatsApp card also includes the photo because all outputs reuse the same `personData.photo`.

Technical detail
```text
Current flow:
CompanyFormDialog
  -> useSyncPersonnelToWorkers()
  -> contractor_representatives saved without photo_path
  -> CompanyDetailDialog builds personData without photo
  -> ID card preview shows placeholder

Fixed flow:
CompanyFormDialog
  -> useSyncPersonnelToWorkers() saves photo_path
  -> useContractorSiteRep returns photo_path
  -> CompanyDetailDialog creates signed URL
  -> getSiteRepPersonData() includes photo
  -> preview / PNG / WhatsApp all show the real photo
```
