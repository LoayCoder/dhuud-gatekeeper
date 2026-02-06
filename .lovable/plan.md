
# Fix Service Worker Timeout in Push Notification Profile Toggle

## Problem Summary

When you click the Push Notifications toggle in Profile, you see:
```
Error checking push subscription: Error: Service worker timeout
```

This happens because the project has **two conflicting push notification systems**:

| System | Service Worker | Hook/Context | Purpose |
|--------|---------------|--------------|---------|
| OneSignal (new) | `OneSignalSDKWorker.js` | `useOneSignal` | Third-party push service |
| Custom VAPID (old) | `sw.js` | `usePushSubscription` | Self-hosted Web Push |

The Profile page uses `usePushSubscription` (the old system), which waits for `sw.js` to be ready. But in development mode, `register-sw.ts` **unregisters all service workers** to avoid HMR caching issues. This causes the timeout.

## Solution: Unify on OneSignal

Since you've integrated OneSignal for push notifications, we should update the Profile page to use the OneSignal system instead of the old VAPID-based system.

### Files to Modify

| File | Change |
|------|--------|
| `src/components/profile/NotificationPreferences.tsx` | Replace `usePushSubscription` with `useOneSignal` |
| `src/hooks/use-push-subscription.ts` | Mark as deprecated or remove if no longer needed |

### Step 1: Update NotificationPreferences.tsx

Replace the VAPID-based hook with OneSignal context:

```typescript
// BEFORE
import { usePushSubscription } from '@/hooks/use-push-subscription';
const { isSubscribed, isLoading: isPushLoading, subscribe, unsubscribe, error: pushError, isAuthenticated } = usePushSubscription();

// AFTER
import { useOneSignal } from '@/contexts/OneSignalContext';
const { 
  isInitialized, 
  isSupported, 
  permissionState, 
  requestPermission, 
  loginUser, 
  logoutUser 
} = useOneSignal();
```

### Step 2: Update handlePushToggle Logic

```typescript
// NEW: Use OneSignal for push toggle
const handlePushToggle = async (checked: boolean) => {
  setIsToggling(true);
  try {
    if (checked) {
      await requestPermission();
      if (user?.id) {
        await loginUser(user.id);
      }
      toast({
        title: t('notifications.pushSubscribed'),
        description: t('notifications.pushSubscribedDescription'),
      });
    } else {
      await logoutUser();
      toast({
        title: t('notifications.pushUnsubscribed'),
        description: t('notifications.pushUnsubscribedDescription'),
      });
    }
  } catch (error) {
    // error handling
  } finally {
    setIsToggling(false);
  }
};
```

### Step 3: Update Test Push Function

The test push should call the `send-onesignal-notification` Edge Function (already created):

```typescript
const handleTestPushNotification = async () => {
  const response = await supabase.functions.invoke('send-onesignal-notification', {
    body: {
      external_ids: [user.id],
      title: 'Test Push Notification',
      body: 'If you see this, OneSignal push is working!'
    }
  });
};
```

### Step 4: Update Switch State

```typescript
// Derive subscription state from OneSignal
const isSubscribed = permissionState === 'granted';
const isPushLoading = !isInitialized;
```

## Development vs Production

| Environment | Behavior |
|-------------|----------|
| Development | `sw.js` is unregistered (HMR conflict avoidance). OneSignal uses its own worker independently |
| Production | Both `sw.js` (offline/caching) and `OneSignalSDKWorker.js` (push) work in parallel |

OneSignal manages its own service worker lifecycle, so it doesn't need `navigator.serviceWorker.ready` from the main SW.

## Additional Cleanup (Optional)

Consider deprecating these files if OneSignal fully replaces custom push:

- `src/hooks/use-push-subscription.ts` - Old VAPID-based hook
- `src/hooks/use-push-test.ts` - Old test hook (uses VAPID system)
- Edge functions for VAPID push (if any)

The database table `push_subscriptions` becomes unused with OneSignal (OneSignal stores subscriptions on their servers).

## Expected Outcome

After this fix:

1. No more "Service worker timeout" error
2. Profile toggle works immediately (uses OneSignal SDK directly)
3. Push subscriptions appear in OneSignal Dashboard
4. Test push button sends via OneSignal API
5. Works in both development and production environments
