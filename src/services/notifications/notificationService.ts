/**
 * Stub: Notification Service
 */

export interface HostArrivalNotificationParams {
  hostPhone: string;
  visitorName: string;
  purpose?: string;
  gateNumber?: string;
}

export async function sendHostArrivalNotification(params: HostArrivalNotificationParams): Promise<{ success: boolean }> {
  console.log('[NotificationService] sendHostArrivalNotification stub called:', params);
  return { success: true };
}
