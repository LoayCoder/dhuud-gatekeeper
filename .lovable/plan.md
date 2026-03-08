

## Plan: Add i18n for `/admin/sla-dashboard` page

### Problem
The `sla` namespace in both EN and AR locale files only contains 6 keys (`classification.*`, `onTrack`, `l1`, `l2`). The SLA Dashboard page and its 5 sub-components use ~60 additional `sla.*` keys that are all missing. Additionally, several `actions.*` and `priority.*` top-level keys used by the dashboard are missing.

### Missing Keys

**`sla` namespace (~55 keys) — used across SLADashboard.tsx, SLAStatusCards, SLACharts, SLACountdownTimer, SLABulkActionsPanel, SLAActionCard, SLAHelpDrawer, SLAPageLayout:**

| Key | Default |
|-----|---------|
| `dashboard` | "SLA Dashboard" |
| `dashboardDescription` | "Real-time overview of corrective action SLA status" |
| `management` | "SLA Management" |
| `investigationSLA` | "Investigation SLA" |
| `analytics` | "Analytics" |
| `liveUpdates` | "Live updates enabled" |
| `distribution` | "Distribution" |
| `activeActions` | "Active Actions" |
| `totalActions` | "{{count}} actions requiring attention" |
| `noActions` | "No actions matching filters" |
| `tryDifferentFilters` | "Try adjusting your search or filters" |
| `countdown` | "Countdown" |
| `filterStatus` | "Status" |
| `filterPriority` | "Priority" |
| `dueSoon` | "Due Soon" |
| `overdue` | "Overdue" |
| `escalated` | "Escalated" |
| `escalatedL1` | "Escalated L1" |
| `escalatedL2` | "Escalated L2" |
| `escalationLevel` | "Escalation Level" |
| `completed` | "Done" |
| `noData` | "No SLA data available" |
| `byPriority` | "By Priority" |
| `warning` | "Warning" |
| `normal` | "Normal" |
| `bulkActions` | "Bulk Actions" |
| `selectedCount` | "{{count}} selected" |
| `reassign` | "Reassign" |
| `extendDueDate` | "Extend Due Date" |
| `exportSelected` | "Export Selected" |
| `reassignActions` | "Reassign Actions" |
| `reassignDescription` | "Reassign {{count}} selected actions to a new user" |
| `newAssignee` | "New Assignee" |
| `selectUser` | "Select user" |
| `daysToExtend` | "Days to Extend" |
| `extend` | "Extend" |
| `extendDescription` | "Extend due dates for {{count}} selected actions" |
| `actionsReassigned` | "{{count}} actions reassigned" |
| `dueDatesExtended` | "Due dates extended by {{days}} days" |
| `extendDeadline` | "Extend Deadline" |
| `manualEscalate` | "Manual Escalate" |
| `help.title` | "SLA Help Guide" |
| `help.subtitle` | "Learn how Service Level Agreements work in this system" |
| `help.overviewTitle` | "SLA Overview" |
| `help.overviewContent` | "Service Level Agreements (SLAs) ensure..." |
| `help.phasesTitle` | "SLA Phases" |
| `help.normalDesc` | "Action is within acceptable timeframe..." |
| `help.warningDesc` | "Approaching due date. Assignee receives email reminder." |
| `help.overdueDesc` | "Past due date but not yet escalated." |
| `help.escalatedL1Desc` | "Manager notified. Requires immediate attention." |
| `help.escalatedL2Desc` | "HSSE Manager notified. Critical priority." |
| `help.configurationTitle` | "Configuring SLAs" |
| `help.configIntro` | "SLA thresholds are configured per priority level:" |
| `help.criticalDesc` | "Shortest timeframes, fastest escalation" |
| `help.highDesc` | "Urgent but less critical" |
| `help.mediumDesc` | "Standard timeframes" |
| `help.lowDesc` | "Extended timeframes" |
| `help.notificationsTitle` | "Notifications" |
| `help.notificationsIntro` | "Automatic email notifications are sent at key stages:" |
| `help.notif1` | "Warning reminder to assignee before due date" |
| `help.notif2` | "Escalation L1 alert to department manager" |
| `help.notif3` | "Escalation L2 alert to HSSE Manager" |
| `help.analyticsTitle` | "Analytics & Reporting" |
| `help.analyticsContent` | "The analytics page provides insights into SLA compliance..." |
| `faq.title` | "Frequently Asked Questions" |
| `faq.q1` | "How do I extend a deadline?" |
| `faq.a1` | "Click on the action and use the 'Request Extension' button..." |
| `faq.q2` | "Can I manually escalate an action?" |
| `faq.a2` | "Yes, from the SLA Dashboard, select actions..." |
| `faq.q3` | "What happens when an action is escalated?" |
| `faq.a3` | "The responsible manager receives an email notification..." |
| `faq.q4` | "How are SLA thresholds calculated?" |
| `faq.a4` | "Thresholds are based on calendar days from the action due date..." |

**Top-level `actions` namespace — missing keys (~4):**

| Key | Default |
|-----|---------|
| `title` | "Title" |
| `referenceId` | "Reference ID" |
| `assignee` | "Assignee" |
| `unassigned` | "Unassigned" |

**Top-level `priority` namespace (new, ~4 keys):**

| Key | Default |
|-----|---------|
| `critical` | "Critical" |
| `high` | "High" |
| `medium` | "Medium" |
| `low` | "Low" |

### Changes

#### 1. `src/locales/en/translation.json`
- Add ~55 missing keys to the existing `sla` object (lines 10781–10791)
- Add 4 missing keys (`title`, `referenceId`, `assignee`, `unassigned`) to the existing top-level `actions` object
- Add a new top-level `priority` object with 4 keys

#### 2. `src/locales/ar/translation.json`
- Add matching ~55 Arabic keys to the existing `sla` object
- Add 4 missing Arabic keys to `actions`
- Add top-level `priority` object with Arabic translations

### No component changes needed
All components already use correct `t()` call paths with proper defaults.

