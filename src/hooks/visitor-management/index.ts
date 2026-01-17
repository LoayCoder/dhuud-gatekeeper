/**
 * Visitor Management Hooks
 * 
 * This barrel file exports all hooks related to visitor management functionality.
 * NOTE: All visitor hooks are completely separate from worker hooks.
 */

// Core Visitor Operations
export * from '../use-visitors';
export * from '../use-visit-requests';

// Visitor Workflow & Settings
export * from '../use-visitor-workflow-settings';

// Host Notifications
export * from '../use-host-arrival-notification';

// Screening
export * from '../use-screening-sla';

// Badge
export * from '../use-badge-api';

// NEW Phase 2: Visitor-specific hooks (separate from worker)
export * from '../use-visitor-access-rules';
export * from '../use-visitor-approvals';
export * from '../use-visitor-inductions';
export * from '../use-visitor-audit-log';
export * from '../use-validate-visitor-access';
