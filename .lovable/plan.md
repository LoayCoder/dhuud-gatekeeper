

# Utilize New ID Card System for Worker Access Pass + Add Settings Tab

## Problem
1. The **Worker Access Pass** page (`/worker-access/:token`) uses an old hardcoded design (dark background, basic layout from the screenshot) instead of the new configurable ID card templates (`IDCardTemplate`)
2. The **ID Card Settings** page exists at `/admin/id-card-settings` but the user wants it accessible under User Management as a Settings/Configuration tab

## Plan

### Part 1: Update Worker Access Pass to Use New ID Card Template

**File: `src/pages/WorkerAccessPass.tsx`**

Replace the old hardcoded badge design with the new `IDCardTemplate` component:

- Fetch the tenant's `tenant_id_card_settings` for `card_type = 'worker'` via the `get-worker-access-pass` edge function (add settings to the response)
- Render `IDCardTemplate` (front side) instead of the manually coded dark card
- Keep the Download and Share buttons working with `html2canvas` on the new template
- Keep the status badges (Active/Expired/Revoked) above the card
- Keep safety instructions and emergency contact sections below the card

**File: `supabase/functions/get-worker-access-pass/index.ts`**

Add fetching of `tenant_id_card_settings` for `card_type = 'worker'` and include it in the response so the public page can render the correct template without authentication.

### Part 2: Add ID Card Settings Tab to User Management

**File: `src/pages/admin/UserManagement/UserManagement.tsx`**

Add a new tab "ID Card Settings" (or a navigation link/button) that links to the existing `/admin/id-card-settings` page, or embed the settings form inline as a tab within User Management.

Given the existing standalone page is well-built with all card types, the cleanest approach is to add a prominent link/button in User Management that navigates to `/admin/id-card-settings`.

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/get-worker-access-pass/index.ts` | Add `tenant_id_card_settings` fetch for worker card type; include in response |
| `src/pages/WorkerAccessPass.tsx` | Replace old hardcoded badge with `IDCardTemplate` component using settings from API |
| `src/pages/admin/UserManagement/UserManagement.tsx` | Add "ID Card Settings" navigation button/link to `/admin/id-card-settings` |

## What Changes for Users
- Workers opening their access pass link see the **new professionally designed ID card** matching the tenant's configured template (colors, fields, logo, layout)
- Admins can find ID Card Settings from the User Management page
- All card types (Visitor, VIP, Worker, Employee, Contractor Rep) continue to be configurable from the settings page

