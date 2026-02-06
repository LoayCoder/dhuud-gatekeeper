

# Fix OneSignal Web Push - Complete Implementation

## Problems Identified

Based on your detailed plan, I found **4 issues** preventing subscriptions from reflecting in OneSignal:

### Issue 1: NotificationPermissionPrompt Outside OneSignalProvider (ROOT CAUSE)

The permission prompt component is rendered **before** OneSignalProvider initializes:

```text
Current App.tsx structure:
┌─────────────────────────────────┐
│ <NotificationPermissionPrompt/> │  ← Uses browser Notification API only
├─────────────────────────────────┤
│ <OneSignalProvider>             │  ← OneSignal context starts here
│   └─ <OneSignalSetup/>          │  ← User login/tags happen here
│ </OneSignalProvider>            │
└─────────────────────────────────┘
```

When a user clicks "Enable" in the prompt, it calls `Notification.requestPermission()` directly (browser API) instead of `OneSignal.Notifications.requestPermission()`. This grants browser permission but does NOT create a OneSignal subscription.

### Issue 2: Missing Backend Secrets

The Edge Function `send-onesignal-notification` requires:
- `ONESIGNAL_APP_ID` - Your OneSignal App ID
- `ONESIGNAL_REST_API_KEY` - Your OneSignal REST API Key

These are NOT configured. Without them, the backend cannot send notifications.

### Issue 3: Service Worker Path Format

Your plan specifies `/OneSignalSDKWorker.js` (with leading slash), but code uses `'OneSignalSDKWorker.js'` (without). OneSignal documentation recommends the leading slash.

### Issue 4: Edge Function CORS Headers

The `send-onesignal-notification` function is missing new Supabase client headers.

---

## Solution

### Step 1: Move NotificationPermissionPrompt Inside OneSignalProvider

**File:** `src/App.tsx`

Move the prompt component inside the `OneSignalProvider` so it has access to OneSignal context:

```tsx
// BEFORE (incorrect)
<NotificationPermissionPrompt />
<AppInitializer />
<OneSignalProvider>

// AFTER (correct)
<AppInitializer />
<OneSignalProvider>
  <NotificationPermissionPrompt />  // Now inside provider
```

### Step 2: Update NotificationPermissionPrompt to Use OneSignal

**File:** `src/components/notifications/NotificationPermissionPrompt.tsx`

Change from using browser `Notification.requestPermission()` to using OneSignal's SDK:

```typescript
// BEFORE: Uses browser API
import { useNotificationPermission } from '@/hooks/use-notification-permission';
const { permission, isSupported, requestPermission } = useNotificationPermission();

// AFTER: Uses OneSignal SDK
import { useOneSignal } from '@/contexts/OneSignalContext';
const { permissionState, isSupported, requestPermission } = useOneSignal();
```

### Step 3: Fix Service Worker Path

**File:** `src/contexts/OneSignalContext.tsx`

Add leading slash as per OneSignal documentation:

```typescript
// BEFORE
serviceWorkerPath: 'OneSignalSDKWorker.js',

// AFTER
serviceWorkerPath: '/OneSignalSDKWorker.js',
```

### Step 4: Add Missing Backend Secrets

Two secrets need to be added to Supabase:

| Secret Name | Where to Find It |
|-------------|------------------|
| `ONESIGNAL_APP_ID` | OneSignal Dashboard → Settings → Keys & IDs → App ID |
| `ONESIGNAL_REST_API_KEY` | OneSignal Dashboard → Settings → Keys & IDs → REST API Key |

### Step 5: Update Edge Function CORS Headers

**File:** `supabase/functions/send-onesignal-notification/index.ts`

```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/App.tsx` | Move `NotificationPermissionPrompt` inside `OneSignalProvider` |
| `src/components/notifications/NotificationPermissionPrompt.tsx` | Switch from `useNotificationPermission` to `useOneSignal` |
| `src/contexts/OneSignalContext.tsx` | Add leading slash to service worker path |
| `supabase/functions/send-onesignal-notification/index.ts` | Update CORS headers |

---

## Testing After Fix

1. Clear browser cache and service workers (DevTools → Application → Clear storage)
2. Reload the page
3. Check console for "OneSignal: Initialized successfully"
4. Click "Enable Notifications" button
5. Grant permission when browser prompts
6. Check OneSignal Dashboard → Audience → Users
7. You should see your subscription with External ID = your Supabase user ID

