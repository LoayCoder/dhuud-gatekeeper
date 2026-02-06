import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

export interface WorkflowNotificationPayload {
  /** The type of workflow event */
  type: 'new_request' | 'status_change';
  /** Notification heading */
  heading: string;
  /** Notification body text */
  content: string;
  /** Additional data passed to the notification (e.g. deep link route) */
  data?: { route?: string; [key: string]: unknown };
  /**
   * Explicit list of user IDs to target.
   * Used for status_change events (target the requester).
   */
  targetUserIds?: string[];
  /**
   * Tag-based filters for targeting (OneSignal segment filters).
   * Used for new_request events (target all approvers).
   */
  filters?: OneSignalFilter[];
}

export interface OneSignalFilter {
  field: 'tag';
  key: string;
  relation: '=' | '!=' | '>' | '<' | 'exists' | 'not_exists';
  value?: string;
}

interface EdgeFunctionResponse {
  success: boolean;
  id?: string;
  errors?: unknown[];
}

/**
 * Calls the `send-onesignal-notification` Supabase Edge Function
 * to deliver a push notification via OneSignal REST API.
 *
 * The REST API key is stored server-side in Supabase Secrets and
 * never exposed to the frontend.
 */
export async function triggerWorkflowNotification(
  payload: WorkflowNotificationPayload
): Promise<EdgeFunctionResponse> {
  try {
    const body: Record<string, unknown> = {
      heading: payload.heading,
      content: payload.content,
      data: payload.data || {},
    };

    if (payload.targetUserIds && payload.targetUserIds.length > 0) {
      body.userIds = payload.targetUserIds;
    }

    if (payload.filters && payload.filters.length > 0) {
      body.filters = payload.filters;
    }

    const { data, error } = await supabase.functions.invoke(
      'send-onesignal-notification',
      { body }
    );

    if (error) {
      logger.error('OneSignal workflow notification failed:', error);
      throw new Error(error.message || 'Edge function invocation failed');
    }

    logger.debug('OneSignal workflow notification sent:', data);
    return data as EdgeFunctionResponse;
  } catch (error) {
    logger.error('triggerWorkflowNotification error:', error);
    throw error;
  }
}

/**
 * Convenience: notify all approvers that a new request has been submitted.
 */
export function notifyNewRequest(params: {
  heading: string;
  content: string;
  requestId: string;
  tenantId: string;
}) {
  return triggerWorkflowNotification({
    type: 'new_request',
    heading: params.heading,
    content: params.content,
    data: { route: `/requests/${params.requestId}` },
    filters: [
      { field: 'tag', key: 'role', relation: '=', value: 'approver' },
      { field: 'tag', key: 'tenant_id', relation: '=', value: params.tenantId },
    ],
  });
}

/**
 * Convenience: notify the original requester about a status change.
 */
export function notifyStatusChange(params: {
  heading: string;
  content: string;
  requestId: string;
  requesterId: string;
}) {
  return triggerWorkflowNotification({
    type: 'status_change',
    heading: params.heading,
    content: params.content,
    data: { route: `/requests/${params.requestId}` },
    targetUserIds: [params.requesterId],
  });
}
