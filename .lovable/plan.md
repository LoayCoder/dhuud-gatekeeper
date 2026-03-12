

# Fix: Wrap Hardcoded Role Strings with Translation in UnifiedTimelineTracker

## Problem

In `UnifiedTimelineTracker.tsx`, the **incident** branch (lines 62-68) has all `typicalRole` values as raw English strings without `t()` wrappers. The observation branch was fixed but the incident branch was missed. These won't display in Arabic.

## Fix

**File:** `src/features/investigation/components/UnifiedTimelineTracker.tsx` (lines 62-68)

Wrap all `typicalRole` strings in the incident branch with `t()`:

```typescript
return [
    { id: '1', ..., typicalRole: t('workflow.roles.reporter', 'Reporter'), ... },
    { id: '2', ..., typicalRole: t('workflow.roles.hsseExpert', 'HSSE Expert'), ... },
    { id: '3', ..., typicalRole: t('workflow.roles.investigator', 'Investigator'), ... },
    { id: '4', ..., typicalRole: t('workflow.roles.actionOwner', 'Action Owner'), ... },
    { id: '5', ..., typicalRole: t('workflow.roles.systemVerifier', 'System Verifier'), ... },
];
```

Also wrap the observation branch role strings that are still raw (lines 55, 57-59): `'Reporter'`, `'Department Rep / Client'`, `'Contractor / Action Owner'`, `'System Verifier'`.

**Scope:** 1 file, ~10 string wraps. No logic changes.

