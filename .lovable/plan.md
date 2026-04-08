

# Integrate ID Card System Fully Across All User Types

## Current State

| User Type | Settings Config | ID Card Button (UI) | Public Pass Page | Uses IDCardTemplate |
|-----------|----------------|---------------------|------------------|---------------------|
| Worker | ✅ | ✅ WorkerDetailDialog | ✅ /worker-access/:token | ✅ |
| Contractor Rep | ✅ | ✅ CompanyDetailDialog | N/A | ✅ (via ActionButton) |
| Visitor | ✅ | ✅ VisitorDetailDialog | ❌ /visitor-pass/:token (old design) | ❌ |
| VIP Visitor | ✅ | ✅ VisitorDetailDialog | ❌ /visitor-badge/:token (old design) | ❌ |
| Employee | ✅ | ❌ No button anywhere | N/A | ❌ |

## Gaps to Fix

### Gap 1: VisitorPass page uses old hardcoded design
`src/pages/VisitorPass.tsx` (287 lines) renders a basic card with manual layout instead of `IDCardTemplate`. Need to migrate it like WorkerAccessPass was migrated.

### Gap 2: VisitorBadgePage uses old hardcoded design
`src/pages/VisitorBadgePage.tsx` (452 lines) renders the visitor badge with old manual design. Need to replace with `IDCardTemplate` using visitor/visitor_vip card type.

### Gap 3: Employee users have no ID card action
The `UserDetailPopover` (shown when clicking a user in User Management) has Edit, Activate/Deactivate, and Delete buttons but no "ID Card" button. Employees should get an ID Card button that uses `cardType="employee"`.

## Plan

### Part 1: Add ID Card Button to UserDetailPopover
**File: `src/features/users/components/UserDetailPopover.tsx`**
- Import `IDCardActionButton` from `@/features/admin`
- Add an ID Card button in the actions section for users with `user_type` of `employee` or `member`
- Map user data to `IDCardPersonData` (fullName, employeeId, department, role from job_title, phone)
- Pass `tenantId` from user's profile context

### Part 2: Migrate VisitorPass to IDCardTemplate
**File: `src/pages/VisitorPass.tsx`**
- Fetch tenant's `tenant_id_card_settings` for `card_type = 'visitor'` alongside the existing gate entry data
- Replace the manual card rendering with `IDCardTemplate` component
- Keep the status badge, safety instructions, and emergency sections
- Keep download/share functionality using `html2canvas` on the new template

### Part 3: Migrate VisitorBadgePage to IDCardTemplate
**File: `src/pages/VisitorBadgePage.tsx`**
- Fetch tenant's `tenant_id_card_settings` for the appropriate card type (visitor or visitor_vip based on `is_vip` flag)
- Replace the manual badge design with `IDCardTemplate`
- Keep download/share buttons working with `html2canvas`
- Keep safety and emergency sections below the card

## Files to Modify

| File | Change |
|------|--------|
| `src/features/users/components/UserDetailPopover.tsx` | Add IDCardActionButton for employee/member users |
| `src/pages/VisitorPass.tsx` | Replace old card with IDCardTemplate + fetch settings |
| `src/pages/VisitorBadgePage.tsx` | Replace old badge with IDCardTemplate + fetch settings |

