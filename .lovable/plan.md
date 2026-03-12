

# Fix Action Workflow Gaps + Build Notification Bell

## Issues Found

### 1. `HSSENotificationCenter` is a stub returning `null`
The header renders `<HSSENotificationCenter />` which returns nothing — no bell icon, no unread badge, no notification popover. The realtime subscription (`useRealtimeNotifications`) fires toasts but there's no persistent notification center UI.

### 2. `MandatoryNotificationDialog` is also a stub returning `null`
Critical HSSE mandatory notifications (from `get_pending_mandatory_notifications` RPC) are never shown to users.

### 3. InlineActionsPanel — Minor Gaps
- **No error handling on confirm**: `handleConfirm` has no try/catch — if `mutateAsync` fails, the dialog stays open in a broken state
- **No success feedback after action**: Toast comes from the mutation hook but the dialog closes before the mutation completes (optimistic) — this is fine but should handle errors gracefully
- **Overdue completion requires notes but no validation enforced**: When completing an overdue action, the hint says "provide justification" but `completionNotes` can be empty

### 4. No `notifications` table in the database
The `notificationService.ts` queries a `notifications` table but it doesn't exist in the schema. The real data lives in `hsse_notifications` + `hsse_notification_reads`. The realtime hook subscribes to `user_notifications` which also doesn't exist. These are disconnected stubs.

## Plan

### Task 1: Build `HSSENotificationCenter` — Real Bell Icon with Popover
Replace the stub with a fully functional notification bell placed next to the language selector.

**File: `src/components/notifications/HSSENotificationCenter.tsx`**
- Import and use `useHSSENotificationsUser()` hook (already has `unreadCount`, `notifications`, `markAsRead`, `getLocalizedTitle`, `getLocalizedBody`)
- Render a `Popover` with:
  - **Trigger**: Bell icon button with unread badge (red dot or count)
  - **Content**: Scrollable notification list (max 10 items), each showing: priority icon, localized title, time ago, read/unread state
  - Click on item → `markAsRead` + navigate to related entity if applicable
  - "Mark All Read" button in header
  - Empty state when no notifications
- Full RTL support, 44px touch targets, responsive width

### Task 2: Build `MandatoryNotificationDialog`
Replace the stub with a real dialog that blocks UI until acknowledged.

**File: `src/components/notifications/MandatoryNotificationDialog.tsx`**
- Use `useHSSENotificationsUser()` → `pendingMandatory`, `acknowledgeNotification`
- Show a non-dismissible `AlertDialog` for the first pending mandatory notification
- Display priority badge, localized title/body, acknowledge button
- On acknowledge → next mandatory shows (or dialog closes)

### Task 3: Fix InlineActionsPanel Error Handling
**File: `src/components/action-center/modules/InlineActionsPanel.tsx`**
- Wrap `handleConfirm` in try/catch — on error, keep dialog open
- Enforce notes for overdue completions (disable confirm button if overdue and notes empty)

### Task 4: Add Translation Keys
**Files: `src/locales/en/translation.json`, `src/locales/ar/translation.json`**
- Add keys for notification bell: `notifications.title`, `notifications.markAllRead`, `notifications.empty`, `notifications.mandatory.acknowledge`, `notifications.mandatory.title`

## Files Modified
1. `src/components/notifications/HSSENotificationCenter.tsx` — Full bell + popover implementation
2. `src/components/notifications/MandatoryNotificationDialog.tsx` — Blocking mandatory dialog
3. `src/components/action-center/modules/InlineActionsPanel.tsx` — Error handling + overdue validation
4. `src/locales/en/translation.json` — Notification keys
5. `src/locales/ar/translation.json` — Notification keys (Arabic)

