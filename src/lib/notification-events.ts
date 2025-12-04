// Real-time notification event handlers for important system events

import { sendPushNotification } from './notification-history';

// Subscription-related notifications
export async function notifySubscriptionApproved(planName: string) {
  return sendPushNotification(
    'Subscription Approved',
    `Your ${planName} subscription request has been approved!`,
    'update'
  );
}

export async function notifySubscriptionDeclined(planName: string) {
  return sendPushNotification(
    'Subscription Request Declined',
    `Your ${planName} subscription request was declined. Check your email for details.`,
    'error'
  );
}

export async function notifyTrialEnding(daysRemaining: number) {
  return sendPushNotification(
    'Trial Ending Soon',
    `Your trial period ends in ${daysRemaining} days. Upgrade now to continue.`,
    'info'
  );
}

export async function notifyTrialExpired() {
  return sendPushNotification(
    'Trial Expired',
    'Your trial period has ended. Please subscribe to continue using the platform.',
    'error'
  );
}

// Security-related notifications
export async function notifySecurityAlert(message: string) {
  return sendPushNotification(
    'Security Alert',
    message,
    'error'
  );
}

export async function notifyNewLogin(deviceInfo: string) {
  return sendPushNotification(
    'New Login Detected',
    `A new login was detected from ${deviceInfo}`,
    'info'
  );
}

export async function notifyMFAEnabled() {
  return sendPushNotification(
    'Two-Factor Authentication Enabled',
    'Your account is now protected with 2FA.',
    'update'
  );
}

export async function notifyMFADisabled() {
  return sendPushNotification(
    'Two-Factor Authentication Disabled',
    'Your account 2FA protection has been removed.',
    'error'
  );
}

export async function notifyBackupCodeUsed() {
  return sendPushNotification(
    'Backup Code Used',
    'A backup code was used to sign in. Consider generating new codes.',
    'error'
  );
}

export async function notifyPasswordChanged() {
  return sendPushNotification(
    'Password Changed',
    'Your account password was successfully changed.',
    'update'
  );
}

// User management notifications
export async function notifyUserLimitWarning(current: number, max: number) {
  return sendPushNotification(
    'User Limit Warning',
    `You're using ${current} of ${max} licensed users (${Math.round((current/max)*100)}%).`,
    'info'
  );
}

export async function notifyUserLimitReached() {
  return sendPushNotification(
    'User Limit Reached',
    'You have reached your licensed user limit. Upgrade to add more users.',
    'error'
  );
}

// Support ticket notifications
export async function notifyTicketStatusChanged(ticketNumber: number, newStatus: string) {
  return sendPushNotification(
    'Support Ticket Updated',
    `Ticket #${ticketNumber} status changed to ${newStatus}.`,
    'info'
  );
}

export async function notifyTicketReply(ticketNumber: number) {
  return sendPushNotification(
    'New Ticket Reply',
    `You have a new reply on ticket #${ticketNumber}.`,
    'update'
  );
}

// Sync notifications
export async function notifySyncComplete(itemCount: number) {
  return sendPushNotification(
    'Sync Complete',
    `Successfully synced ${itemCount} pending changes.`,
    'sync'
  );
}

export async function notifySyncFailed(errorMessage?: string) {
  return sendPushNotification(
    'Sync Failed',
    errorMessage || 'Some changes could not be synced. Will retry when online.',
    'error'
  );
}

// Generic notification helper
export async function sendAppNotification(
  title: string,
  body: string,
  type: 'sync' | 'update' | 'info' | 'error' = 'info'
) {
  return sendPushNotification(title, body, type);
}
