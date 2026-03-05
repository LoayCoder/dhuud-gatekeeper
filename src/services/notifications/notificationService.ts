// Stub for notification service
export interface HostArrivalNotificationParams {
  hostPhone: string;
  visitorName: string;
  visitPurpose?: string;
}

export async function sendHostArrivalNotification(params: HostArrivalNotificationParams) {
  console.log('[NotificationService] sendHostArrivalNotification stub called', params);
  return { success: true };
}

export async function sendNotification(params: Record<string, unknown>) {
  console.log('[NotificationService] sendNotification stub called', params);
  return { success: true };
}

export async function markNotificationAsRead(id: string) {
  console.log('[NotificationService] markNotificationAsRead stub called', id);
  return { success: true };
}

export async function markAllNotificationsAsRead(userId: string) {
  console.log('[NotificationService] markAllNotificationsAsRead stub called', userId);
  return { success: true };
}

export async function getUnreadCount(userId: string) {
  console.log('[NotificationService] getUnreadCount stub called', userId);
  return 0;
}
