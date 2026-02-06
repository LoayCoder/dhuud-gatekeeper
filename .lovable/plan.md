

## OneSignal Push Notifications Configuration

### Current Issue
The `VITE_ONESIGNAL_APP_ID` environment variable is currently empty, causing OneSignal to skip initialization and display "Notifications are not supported in this browser."

### Solution

**Step 1: Add the OneSignal App ID Secret**
- Configure `VITE_ONESIGNAL_APP_ID` with value: `429a7a2d-7d30-42eb-88a8-4dcf50ce881d`

**Step 2: Verification After Secret is Added**
1. Perform a hard refresh (Ctrl+Shift+R / Cmd+Shift+R)
2. Check browser console for: `OneSignal: Initialized successfully ✅`
3. Navigate to Profile page
4. The "Push Notifications" card should now show the enable button instead of "not supported"
5. Click "Enable Notifications" and accept the browser permission prompt
6. Test with "Send Test Notification" button

### Technical Details

| Component | Status |
|-----------|--------|
| `OneSignalSDKWorker.js` | Already in place |
| `OneSignalContext.tsx` | Ready with logging |
| `register-sw.ts` | Updated to preserve OneSignal SW |
| Backend secrets | `ONESIGNAL_APP_ID` and `ONESIGNAL_REST_API_KEY` need verification |

### Expected Outcome
After adding the App ID, OneSignal will initialize successfully, allowing users to:
- Enable push notifications from their profile
- Receive real-time notifications for approvals, status changes, and other workflow events

