

# Fix: Investigation Workspace Button Always Visible

## Problem
After switching the badge from tenant-wide `stats.openInvestigations` (10) to user-specific `myInvestigationsCount` (0), the `showOnlyWithBadge: true` flag hides the button entirely because the badge is 0.

## Fix
**`src/components/action-center/modules/IncidentsModule.tsx`** — Remove `showOnlyWithBadge: true` from the Investigation Workspace action link (line 91). The button should always be visible so users can navigate to the workspace regardless of whether they have assigned investigations.

