

# Fix: Missing `securityAudit` Translation Namespace in Arabic

## Problem
In `src/locales/ar/translation.json` line 4963, `securityAudit` is a flat string (`"سجل الأمان"`). The English file has it as a nested object with ~45 keys (lines 5119–5163). Every `t('securityAudit.title')`, `t('securityAudit.suspiciousActivity')`, etc. falls back to English — the entire `/admin/security-audit` page is untranslated.

## Fix
Replace the flat string with a full nested Arabic translation object matching the EN structure:

- **Page chrome** (~5): title, description, realtime, overview
- **Tab labels** (~7): suspiciousActivity, activeSessions, securityEvents, userManagement, sensitiveAccess, settingsActions
- **Sensitive data access** (~10): accessLogDescription, searchPlaceholder, filterByType, totalAccesses, granted, denied, uniqueUsers, noLogs
- **User management** (~10): userActivityLog, userActivityDescription, performedBy, action, targetUser, changes, created/updated/activated/deactivated, noUserLogs
- **Security events** (~8): securityEventsTitle, securityEventsDescription, logins, backupCodesUsed, mfaFailed, searchUserPlaceholder, filterByEvent, noSecurityLogs

## File Modified
1. **`src/locales/ar/translation.json`** — Replace line 4963 flat string with full nested object (~45 Arabic keys)

