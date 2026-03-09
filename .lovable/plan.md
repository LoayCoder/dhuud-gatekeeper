

# Fix: Missing `userManagement` Translation Namespace in Arabic

## Problem
In `src/locales/ar/translation.json`, `userManagement` is defined as a flat string (`"إدارة المستخدمين"`) at line 2944. The English file has it as a nested object with ~160 keys (lines 5681–5844). This means every `t('userManagement.title')`, `t('userManagement.addUser')`, `t('userManagement.filters')`, etc. resolves to English fallbacks for Arabic users — the entire `/admin/users` page is untranslated.

## Fix
Replace the flat string `"userManagement": "إدارة المستخدمين"` in the AR file with a full nested object matching the EN structure, containing professional Arabic translations for all ~160 keys including:

- **Page chrome** (~10 keys): title, description, addUser, editUser, importUsers, export
- **Filters** (~12 keys): filters, filterByType/Status/Branch/Division/Role, allTypes/Statuses/Divisions/Roles, searchPlaceholder, clearFilters
- **Table columns & status** (~15 keys): userType, status, roles, active, inactive, hasLogin, employeeId, jobTitle
- **User form tabs & fields** (~30 keys): tabBasic, tabRoles, tabOrg, tabDetails, platformAccess, loginEnabled/Disabled, organizationalAssignment, fullBranchAccess, companyName, contractStart/End, membershipId/Start/End
- **Bulk actions** (~12 keys): selectAll, clearSelection, bulkActivate/Deactivate/Delete, confirmBulk*, bulkSuccess*
- **CRUD toasts** (~10 keys): userCreated, userUpdated, userDeleted, userActivated, userDeactivated, saveFailed
- **Invitation** (~6 keys): invitationSent, invitationFailed, invitationSentBoth, invitationSentWhatsApp, invitationCreated, deliveryFailed, sendInvitation
- **Email sync** (~8 keys): syncEmail, syncFailed, emailSynced, emailsSynced, syncComplete, emailMismatchWarning, syncAllEmails
- **Password reset** (~6 keys): resetPassword, resetPasswordConfirm, passwordResetSuccess, passwordSentViaWhatsApp, noPhoneNumber
- **Import sub-object** (~25 keys): title, instructions, downloadTemplate, dropzone, validUsers, invalidRows, quotaExceeded, importing, complete, results, field validation messages
- **Quota & license** (~5 keys): licensedUsers, usersWithLogin, activeUsers, slotsRemaining, quotaReached

## Files Modified
1. **`src/locales/ar/translation.json`** — Replace line 2944 flat string with full nested object (~160 Arabic keys)

