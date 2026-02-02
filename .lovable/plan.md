

# Version Update Detection & Prompt Enhancement Plan

## Problem Summary

1. **Build Error**: `src/hooks/use-close-observation.ts` line 59 uses `profile.id` but the `Profile` interface in `AuthContext` doesn't include `id`
2. **Slow Update Detection**: Current check interval is 30 minutes with localStorage-only comparison
3. **Missing Prompt Requirement**: Users want to be prompted for every published update, not just new versions

---

## Root Cause Analysis

### Build Error
The `Profile` interface in `AuthContext.tsx` (line 14-25) only includes:
- `full_name`, `avatar_url`, `tenant_id`, `preferred_language`
- `assigned_branch_id`, `assigned_site_id`, `assigned_department_id`
- `contractor_company_name`, `is_deleted`, `is_active`

But the `fetchProfile` function (line 77) DOES select `id`:
```typescript
.select('id, full_name, avatar_url, tenant_id, ...')
```

The interface is simply missing the `id` field that's already being fetched.

### Slow Version Detection
Current flow:
1. Check every 30 minutes (`CHECK_INTERVAL = 30 * 60 * 1000`)
2. Compares `version.json` version string vs localStorage
3. No server-push mechanism

### Missing Update Prompts
Current "What's New" dialog only shows if:
- `version !== seenVersion` (localStorage check)
- User must manually dismiss to mark as "seen"
- No tracking of `publishedAt` timestamp changes

---

## Solution Design

### Fix 1: Add `id` to Profile Interface

Update `src/contexts/AuthContext.tsx`:

```typescript
interface Profile {
  id: string;  // ADD THIS
  full_name: string | null;
  avatar_url: string | null;
  tenant_id: string;
  // ... rest unchanged
}
```

### Fix 2: Faster Version Detection

Reduce check intervals and add multiple trigger points:

| Trigger | Interval | Purpose |
|:--------|:---------|:--------|
| Initial load | 2 seconds | Fast first check |
| Periodic | 5 minutes (was 30) | More responsive |
| Visibility change | Immediate | When user returns |
| Online event | Immediate | After reconnection |
| Focus event | Immediate | NEW: When window gains focus |

### Fix 3: Prompt for Every Published Update

Change from version-only comparison to `publishedAt` timestamp tracking:

**New Logic:**
1. Store `lastSeenPublishedAt` in localStorage (not just version)
2. When `publishedAt` in `version.json` is newer than stored, show "What's New"
3. This ensures re-publishes of same version also prompt users

**Data Flow:**
```text
version.json
  └── publishedAt: "2026-02-02T10:00:00Z"
         ↓
Compare with localStorage
  └── lastSeenPublishedAt: "2026-02-01T14:30:00Z"
         ↓
If newer → Show "What's New" Dialog
         ↓
On dismiss → Store new publishedAt
```

---

## Implementation Details

### File 1: `src/contexts/AuthContext.tsx`

Add `id: string` to Profile interface (line 14-25)

### File 2: `src/hooks/use-app-update-check.ts`

1. Reduce `CHECK_INTERVAL` from 30 minutes to 5 minutes
2. Add `publishedAt` to `VersionInfo` interface
3. Add focus event listener for faster detection
4. Store and compare `publishedAt` timestamp

### File 3: `src/components/pwa/WhatsNewDialog.tsx`

1. Change from version comparison to `publishedAt` comparison
2. New storage key: `app-whats-new-seen-at` (stores timestamp)
3. Show dialog when `publishedAt > lastSeenPublishedAt`

### File 4: `src/hooks/use-version-info.ts`

Already has `publishedAt` support - no changes needed

### File 5: `public/version.json`

Already has `publishedAt` field - no changes needed

---

## Updated Constants

| Constant | Old Value | New Value |
|:---------|:----------|:----------|
| `CHECK_INTERVAL` | 30 minutes | 5 minutes |
| `SEEN_VERSION_KEY` | `app-whats-new-seen` | `app-whats-new-seen-at` |
| Initial check delay | 3 seconds | 2 seconds |

---

## Technical Details

### New Comparison Logic

```typescript
// Old: Version string comparison
if (version !== seenVersion) { showDialog(); }

// New: Timestamp comparison
const serverPublishedAt = new Date(versionInfo.publishedAt).getTime();
const seenPublishedAt = parseInt(localStorage.getItem(SEEN_AT_KEY) || '0');
if (serverPublishedAt > seenPublishedAt) { showDialog(); }
```

### Focus Event Listener

```typescript
useEffect(() => {
  const handleFocus = () => {
    checkForUpdates();
  };
  window.addEventListener('focus', handleFocus);
  return () => window.removeEventListener('focus', handleFocus);
}, [checkForUpdates]);
```

---

## Files to Modify

| File | Changes |
|:-----|:--------|
| `src/contexts/AuthContext.tsx` | Add `id: string` to Profile interface |
| `src/hooks/use-app-update-check.ts` | Add `publishedAt`, reduce interval, add focus listener |
| `src/components/pwa/WhatsNewDialog.tsx` | Compare `publishedAt` timestamps |

---

## Expected Behavior After Changes

1. **Build Error**: Fixed - `profile.id` will be properly typed
2. **Faster Detection**: Updates detected within 5 minutes (vs 30) or immediately on focus/visibility
3. **Every Publish Prompts**: Even re-publishing same version with new `publishedAt` will trigger "What's New" dialog

