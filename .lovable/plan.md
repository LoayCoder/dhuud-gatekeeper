

# Fix: Complete Translation for `/admin/security-audit` Page

## Problem
The `securityAudit` namespace (lines 4963–5012 in AR) was fixed in the previous round, but it only covers ~50 keys used by the **inner tab content** components. The page has **three additional layers** of untranslated text:

### Layer 1: Missing `securityAudit.*` keys (~15 keys)
The Suspicious Activity tab uses keys not in the AR file:
- `suspiciousActivityTitle`, `suspiciousActivityDescription`, `searchByEmailLocation`
- `riskScore`, `location`, `device`, `flags`, `totalLogins`, `newDevices`
- `failedOnly`, `newDevice`, `newLocation`, `vpnProxy`, `success`
- `noSuspiciousActivity`, `noSuspiciousActivityDescription`
- `noAccessLogs`, `noAccessLogsDescription`

### Layer 2: Missing `security.*` keys (~65 keys)
The Overview, Active Sessions, and Settings & Actions tabs use `security.*` keys that have **zero Arabic translations**:

**Overview Tab (~20 keys):**
`totalUsers`, `activeAccounts`, `activeSessions`, `currentlyLoggedIn`, `suspiciousLogins`, `failedLogins`, `last24Hours`, `mfaAdoption`, `mfaAdoptionDescription`, `users`, `mfaLowWarning`, `mfaGood`, `securityStatus`, `emergencyMode`, `attentionNeeded`, `allClear`, `recentEmergencyActions`, `deviceSecurity`, `ipValidationEnabled`, `glassBreakActiveWarning`, `glassBreakActiveDescription`

**Active Sessions Tab (~20 keys):**
`activeSessionsDescription`, `searchSessions`, `sessions`, `user`, `location`, `device`, `lastActivity`, `expires`, `actions`, `noActiveSessions`, `sessionTerminated`, `sessionTerminatedDescription`, `terminateAll`, `terminateSession`, `terminateSessionConfirm`, `terminate`, `allSessionsTerminated`, `allSessionsTerminatedDescription`, `terminateAllSessions`, `terminateAllConfirm`, `sessionsWillBeTerminated`

**Settings & Actions Tab (~15 keys):**
`selectTenantFirst`, `currentStatus`, `securityStatusFor`, `glassBreak`, `inactive`, `expiresAt`, `lastShutdown`, `emergencyActions`, `emergencyActionsDescription`, `glassBreakDescription`, `deactivate`, `activate`, `systemShutdown`, `systemShutdownDescription`, `shutdown`, `usersAffected`

**Glass Break Dialog (~10 keys):**
`activateGlassBreak`, `glassBreakWarning`, `glassBreakAuditWarning`, `tenant`, `reason`, `glassBreakReasonPlaceholder`, `minimumCharacters`, `duration`, `typeToConfirm`

**System Shutdown Dialog (~10 keys):**
`shutdownWarning`, `allUsersLoggedOut`, `unsavedWorkLost`, `actionIrreversible`, `activeSessionsToTerminate`, `shutdownReasonPlaceholder`, `typeTenantNameToConfirm`, `shutdownNow`

**Tenant Selector (~3 keys):**
`glassBreakActive`, `selectTenant`, `allTenants`

## Fix

### File 1: `src/locales/ar/translation.json`
Two edits:

1. **Add ~15 missing keys to the `securityAudit` object** (after line 5011, before the closing `}`):
   - Suspicious Activity tab keys
   - Sensitive Data empty state keys

2. **Add ~65 missing `security.*` keys** to the existing `security` object (at lines 10685+ which the dedup parser merges). Add keys for:
   - Overview stats (totalUsers, mfaAdoption, etc.)
   - Active Sessions management (terminate, search, etc.)
   - Settings & Emergency Actions (glassBreak, systemShutdown, etc.)
   - Glass Break Dialog
   - System Shutdown Dialog
   - Tenant Selector

