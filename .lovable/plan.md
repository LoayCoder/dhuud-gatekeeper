

# Fix OneSignal Push Notifications

## Problem Summary

The push notification popup is not appearing because OneSignal is failing to initialize due to a **service worker path mismatch**.

## Root Cause

The OneSignal initialization configuration has conflicting settings:

```typescript
// src/contexts/OneSignalContext.tsx
await OneSignal.init({
  serviceWorkerParam: { scope: '/push/onesignal/' },  // Sets scope to subdirectory
  serviceWorkerPath: '/OneSignalSDKWorker.js',         // But file is at root
});
```

When you navigate to `/push/onesignal/OneSignalSDKWorker.js`, it returns a **404 error**. The file only exists at the root `/OneSignalSDKWorker.js`.

This causes OneSignal to silently fail during initialization, which is why:
- No push notification prompt appears
- The subscription toggle in Profile does nothing
- No data is reflected in OneSignal dashboard

## Solution

### Option A (Recommended): Simplify the Service Worker Configuration

Remove the custom scope since the service worker file is at the root. This is the standard OneSignal setup.

**File to Modify:** `src/contexts/OneSignalContext.tsx`

**Change (lines 44-49):**

```typescript
// BEFORE
await OneSignal.init({
  appId: ONESIGNAL_APP_ID,
  allowLocalhostAsSecureOrigin: import.meta.env.DEV,
  serviceWorkerParam: { scope: '/push/onesignal/' },
  serviceWorkerPath: '/OneSignalSDKWorker.js',
});

// AFTER
await OneSignal.init({
  appId: ONESIGNAL_APP_ID,
  allowLocalhostAsSecureOrigin: import.meta.env.DEV,
  serviceWorkerPath: 'OneSignalSDKWorker.js', // No leading slash, no scope
});
```

### Why This Works

- Removes the conflicting `serviceWorkerParam.scope`
- Uses the default root scope (`/`)
- Points to the correct service worker file at `/OneSignalSDKWorker.js`

## Additional: Prevent PWA Service Worker Conflict

Since this project has its own PWA service worker (`sw.js`), we should also verify there are no conflicts. The OneSignal service worker should operate independently.

## Technical Notes

| Setting | Before | After |
|---------|--------|-------|
| Service Worker Scope | `/push/onesignal/` | `/` (default) |
| Service Worker Path | `/OneSignalSDKWorker.js` | `OneSignalSDKWorker.js` |
| File Location | `/public/OneSignalSDKWorker.js` | No change |

## Expected Outcome

After this fix:

1. OneSignal will initialize successfully (logs will show "OneSignal: Initialized successfully")
2. The push notification permission prompt will appear for new users
3. The Profile page toggle will work and update OneSignal subscription
4. Users will appear in your OneSignal dashboard

## Testing Steps

1. Clear browser cache/service workers (DevTools > Application > Clear storage)
2. Reload the page
3. Check console for "OneSignal: Initialized successfully"
4. Enable notifications in Profile settings
5. Verify subscription appears in OneSignal dashboard

