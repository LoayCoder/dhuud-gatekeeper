

# Fix: "Pending With" shows unassigned for claimed non-contractor observations

## Problem

In `src/lib/current-owner.ts` line 64, for non-contractor observations at `expert_screening` / `pending_expert_screening`, the code **always** returns `buildOwner(null, "HSSE Expert", true)` — hardcoded as unassigned. It never checks whether `approval_manager` is already set (which happens when the HSSE Expert claims the observation).

The contractor path (lines 60-62) correctly resolves the name from `approval_manager`, but the non-contractor fallback on line 64 skips this entirely.

## Fix

**File:** `src/lib/current-owner.ts` (line 64)

Change the non-contractor fallback from:
```typescript
return buildOwner(null, "HSSE Expert", true);
```

To:
```typescript
const expertName = incident.approval_manager?.full_name || null;
return buildOwner(expertName, "HSSE Expert", !expertName);
```

This mirrors the contractor path logic — if `approval_manager` is set (expert claimed it), show their name. If not, show the unassigned warning with "Contact admin to assign a HSSE Expert".

## Impact

- OBS-2026-0111 and OBS-2026-0115 will show the user's name instead of the red warning badge
- Unclaimed observations will still correctly show the "No user assigned" warning
- No other files need changes — `ResponsibleUserBadge` and `UnifiedTimelineTracker` already handle both assigned and unassigned states correctly

