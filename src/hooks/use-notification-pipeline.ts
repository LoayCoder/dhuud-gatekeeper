/**
 * USE NOTIFICATION PIPELINE
 *
 * React hook that wraps the unified notification pipeline for component use.
 * This is the ONLY hook modules should use to trigger notifications.
 *
 * Usage:
 *   const { notify, isProcessing } = useNotificationPipeline();
 *
 *   await notify({
 *     eventType: 'incident.created',
 *     priority: 'high',
 *     source: { entityType: 'incident', entityId: '...', referenceId: 'INC-001' },
 *     variables: { reporter_name: '...', severity: '...', location: '...' },
 *     recipientOverrides: [{ userId: '...', email: '...', name: '...' }],
 *   });
 */

import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';
import {
  processActionEvent,
  createActionEvent,
  type ActionEvent,
  type ActionEventType,
  type NotificationPriority,
  type NotificationRecipient,
  type PipelineResult,
} from '@/lib/notifications';

const log = logger.scoped('useNotificationPipeline');

interface NotifyParams {
  eventType: ActionEventType;
  priority: NotificationPriority;
  source: {
    entityType: string;
    entityId: string;
    referenceId?: string;
  };
  variables: Record<string, string>;
  recipientOverrides?: NotificationRecipient[];
  metadata?: Record<string, unknown>;
}

interface UseNotificationPipelineReturn {
  /** Send a notification through the unified pipeline */
  notify: (params: NotifyParams) => Promise<PipelineResult | null>;
  /** Whether a notification is currently being processed */
  isProcessing: boolean;
  /** Last result from the pipeline */
  lastResult: PipelineResult | null;
  /** Last error if the pipeline failed */
  lastError: Error | null;
}

export function useNotificationPipeline(): UseNotificationPipelineReturn {
  const { user, profile } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<PipelineResult | null>(null);
  const [lastError, setLastError] = useState<Error | null>(null);

  const notify = useCallback(async (params: NotifyParams): Promise<PipelineResult | null> => {
    if (!profile?.tenant_id) {
      log.warn('Cannot send notification: no tenant context');
      return null;
    }

    setIsProcessing(true);
    setLastError(null);

    try {
      const event = createActionEvent({
        eventType: params.eventType,
        priority: params.priority,
        tenantId: profile.tenant_id,
        actorId: user?.id || null,
        source: params.source,
        variables: params.variables,
        recipientOverrides: params.recipientOverrides,
        metadata: params.metadata,
      });

      const result = await processActionEvent(event);
      setLastResult(result);

      if (result.deduplicated) {
        log.info(`Event deduplicated: ${params.eventType}`);
      } else {
        const sent = result.deliveries.filter(d => d.status === 'sent').length;
        const failed = result.deliveries.filter(d => d.status === 'failed').length;
        log.info(`Event processed: ${params.eventType} — ${sent} sent, ${failed} failed`);
      }

      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Pipeline processing failed');
      log.error('Pipeline error:', err);
      setLastError(err);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [user?.id, profile?.tenant_id]);

  return { notify, isProcessing, lastResult, lastError };
}
