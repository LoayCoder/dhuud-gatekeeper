

# Upgrade Contractor Portal Worker Edit Form

## Problem
The contractor portal uses an outdated `ContractorWorkerEditForm` with a plain layout (no photo upload, no RTL-aware nationality list, no success alert). The admin-side `WorkerFormDialog` has a richer UX with photo upload, scroll area, grid layout, and proper RTL support.

## Plan

### Update `ContractorWorkerEditForm.tsx`
Align the portal edit form with the admin `WorkerFormDialog` while keeping portal-specific logic (re-approval warning, portal update hook):

1. **Add photo upload** — integrate `WorkerPhotoUpload` component at the top of the form (using `Controller` like the admin form)
2. **Add `full_name_ar` field** — keep this portal-specific field (admin form doesn't have it)
3. **Improve layout** — use `ScrollArea` for overflow, grid layout for National ID + Mobile row
4. **RTL-aware nationality list** — show `nat.name_ar` in RTL mode with `ScrollArea` inside `SelectContent`
5. **Add preferred_language field** — keep existing
6. **Add success alert** — show green success banner briefly before closing, like admin form
7. **Keep re-approval warning** — retain the amber warning for approved workers
8. **Wrap in `DialogDescription`** for accessibility
9. **Add `photo_path` to schema and update hook** — extend `editWorkerSchema` with optional `photo_path`, pass it through to the update mutation

### Update `use-update-contractor-worker-portal.ts`
Add `photo_path` to the `UpdateWorkerData` interface and include it in the update payload so portal users can update worker photos.

### Summary
| File | Change |
|------|--------|
| `ContractorWorkerEditForm.tsx` | Add photo upload, grid layout, ScrollArea, RTL nationality, success alert |
| `use-update-contractor-worker-portal.ts` | Add `photo_path` to data interface and update payload |

