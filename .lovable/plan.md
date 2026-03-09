

# Fix: Missing `hsseNotifications` Translation Namespace in Arabic

## Problem
In `src/locales/ar/translation.json` line 1925, `hsseNotifications` is a flat string (`"إشعارات الصحة والسلامة"`). The English file has it as a nested object with ~100 keys (lines 4874–4973) covering the entire HSSE Notifications management page and analytics. Every `t('hsseNotifications.title')`, `t('hsseNotifications.createNotification')`, etc. falls back to English.

## Fix

### File: `src/locales/ar/translation.json`

Replace the flat string at line 1925 with the full nested object matching the EN structure (~100 keys):

**Page chrome:** `title`, `pageTitle`, `pageDescription`, `viewAnalytics`, `createNotification`, `createDescription`

**Tabs:** `all`, `mandatoryTab`, `readTab`

**Form fields:** `titleEn`, `titleAr`, `titlePlaceholder`, `titlePlaceholderAr`, `bodyEn`, `bodyAr`, `bodyPlaceholder`, `bodyPlaceholderAr`, `category`, `priorityLabel`, `notificationType`, `informational`, `mandatoryType`, `mandatoryHint`, `targetAudience`, `sendPush`, `sendEmail`, `publishImmediately`, `emailCriticalHint`

**External recipients:** `externalRecipients`, `externalRecipientsHint`, `includeWorkersOnSite`, `includeVisitorsOnSite`, `whatsappDeliveryNote`

**Table & actions:** `create`, `noNotifications`, `titleLabel`, `type`, `status`, `acknowledgments`, `createdAt`, `mandatory`, `inactive`, `published`, `draft`, `publish`, `deactivate`, `deleteConfirmTitle`, `deleteConfirmDescription`

**Stats:** `totalNotifications`, `publishedCount`, `mandatoryCount`, `draftCount`, `allNotifications`, `manageNotifications`

**Nested objects:**
- `categories`: weather_risk, regulation, safety_alert, policy_update, training, general
- `priorities`: critical, high, medium, low
- `targets`: all_users, specific_roles, specific_branches, specific_sites
- `analytics` (~25 keys): title, subtitle, noData, totalMandatory, last30Days, overallAckRate, avgResponseTime, overdue, weeklyTrend, weeklyTrendDesc, sent, ackRate, responseByPriority, responseByPriorityDesc, avgResponse, byCategory, complianceByBranch, complianceByBranchDesc, branch, notifications, acknowledged, rate, summary, metric, value

**Toast messages (from hooks):** `notificationCreated`, `notificationPublished`, `notificationDeactivated`, `notificationDeleted`

