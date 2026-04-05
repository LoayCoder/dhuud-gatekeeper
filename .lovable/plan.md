

# Add Contractor Portal to Sidebar & Home Page

## Overview
Make the Contractor Portal accessible from both the sidebar menu and the home page action cards for users with the `contractor` role category (contractor representatives) and admin/superadmin users.

## Changes

### 1. Add Contractor Portal to Sidebar Menu
**File:** `src/components/layout/sidebar/menu/useContractorsPTWMenu.ts`

Add a new "Contractor Portal" top-level group (separate from the existing admin-facing "Contractors" section) with 5 sub-items: Dashboard, Workers, Projects, Gate Passes, Activity Log. Use the existing `contractor_portal_*` menu codes from the route registry.

### 2. Unhide Contractor Portal Routes
**File:** `src/config/route-registry.ts`

Remove `hidden: true` and `hiddenReason` from all 5 contractor portal routes (lines 1031-1080) so the sidebar auto-generation can pick them up.

### 3. Add Contractor Portal Menu Group
**File:** `src/config/menu-groups.ts`

Add a new `contractor_portal` menu group entry (with `Building2` icon, sortOrder ~11) so it appears in the menu group hierarchy.

### 4. Add Contractor Portal Home Card
**File:** `src/config/home-actions.ts`

Add a new card:
- id: `contractor-portal`
- labelKey: `home.cards.contractorPortal`
- icon: `Building2`
- path: `/contractor-portal`
- colorScheme: `primary`
- categories: `['contractor']` — a new RoleCardCategory

### 5. Extend RoleCardCategory
**File:** `src/config/home-actions.ts`

Add `'contractor'` to the `RoleCardCategory` type union.

### 6. Update useHomeActions to Support Contractor Category
**File:** `src/hooks/use-home-actions.ts`

Add a check for `hasRoleInCategory('contractor')` to add the `'contractor'` category to `userCategories`, similar to how `security` and `hsse` are handled. Also add admin/superadmin fallback so admins see the card too.

## Result
- Contractor reps and admins see "Contractor Portal" in the sidebar under its own section
- Contractor reps see a "Contractor Portal" action card on the home page
- All access remains gated by the existing `ContractorPortalRoute` wrapper and menu access system

