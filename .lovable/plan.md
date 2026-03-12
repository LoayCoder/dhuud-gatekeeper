

# Make Pending Approvals Always Visible (Same Fix as Investigation Workspace)

## Problem
The "Pending Approvals" button has `showOnlyWithBadge: true` (line 100), which hides it when the user has zero pending approvals — the same issue we just fixed for Investigation Workspace.

"My Actions" is already always visible (no `showOnlyWithBadge` flag), and both badges already use user-specific counts, so no data changes are needed there.

## Fix

**`src/components/action-center/modules/IncidentsModule.tsx`** — Remove `showOnlyWithBadge: true` from the Pending Approvals action link (line 100) so the button remains visible regardless of count.

