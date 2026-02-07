/**
 * UNIFIED NOTIFICATION SYSTEM
 *
 * Single public API for the notification pipeline.
 * All modules import from here — never from individual files.
 */

// Core pipeline
export { processActionEvent, createActionEvent } from './pipeline';

// Types
export type {
  ActionEvent,
  ActionEventType,
  NotificationChannel,
  NotificationPriority,
  NotificationRecipient,
  ChannelDeliveryConfig,
  DeliveryResult,
  PipelineResult,
  NotificationTemplate,
  NotificationRoutingRule,
  NotificationAuditEntry,
  DeliveryStatus,
  PreferenceCategory,
} from './types';

export { ALL_CHANNELS, EVENT_TO_PREFERENCE } from './types';

// Event mapper
export {
  mapActionEventToDeliveries,
  getDefaultChannelsForEvent,
  getTemplateSlugForEvent,
} from './action-event-mapper';

// Template registry
export {
  resolveTemplate,
  renderTemplate,
  renderTemplateForChannel,
  getBuiltinTemplateSlugs,
  getBuiltinTemplate,
} from './template-registry';

// Idempotency
export {
  isDuplicateEvent,
  markEventProcessed,
  generateEventId,
  cleanupDedupCache,
} from './idempotency';
