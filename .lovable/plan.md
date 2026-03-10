

# Fix: Missing `admin.updates` Namespace for App Updates Page

## Problem

The `/admin/app-updates` page and its 3 components (`AppUpdateBroadcastPanel`, `BroadcastUpdateDialog`, `UpdateHistoryTable`) use ~30 translation keys under `admin.updates.*` that don't exist in either English or Arabic translation files. The entire namespace is missing.

## Keys Needed (extracted from components)

**Page (2):** title, subtitle

**BroadcastPanel (14):** currentVersion, versionDescription, alreadyBroadcast, buildDate, publishedAt, releaseNotes, estimatedRecipients, notifyAllUsers, alreadyBroadcastMessage, noSubscriptions, versionNotFound, broadcastHistory, historyDescription

**BroadcastDialog (15):** confirmBroadcast, confirmBroadcastDesc, version, recipients, users, releaseNotes, notificationPriority, priorityNormal, priorityNormalDesc, priorityImportant, priorityImportantDesc, priorityCritical, priorityCriticalDesc, customMessage, customMessagePlaceholder, criticalWarning, sending, sendNotification

**HistoryTable (9):** critical, important, normal, version, priority, delivered, success, publishedAt, broadcastAt, noHistory, noHistoryDesc

**Hook toasts (2):** broadcastSuccess, broadcastDetails, broadcastError

## Fix

### File 1: `src/locales/en/translation.json`
Add `"updates": { ... }` inside the `admin` object with all ~35 English keys.

### File 2: `src/locales/ar/translation.json`
Add `"updates": { ... }` inside the `admin` object with all ~35 Arabic translations.

No component changes needed — all keys already match the `t()` calls.

