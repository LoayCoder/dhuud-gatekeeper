/**
 * Inspection Management Hooks
 * 
 * This barrel file exports all hooks related to inspection and audit functionality.
 */

// Core Inspection Operations
export * from '../use-inspections';
export * from '../use-inspection-sessions';
export * from '../use-inspection-schedules';
// Note: use-inspection-actions excluded to avoid duplicate exports with use-area-findings (useCreateActionFromFinding)

// Inspection Dashboard & Analytics
export * from '../use-inspection-dashboard';
export * from '../use-inspection-analytics';

// Inspection Categories & Templates
export * from '../use-inspection-categories';

// Inspection Uploads
// Note: use-inspection-actions excluded to avoid duplicate exports with use-area-findings

// Area Inspections
export * from '../use-area-inspections';
export * from '../use-area-findings';
export * from '../use-offline-area-inspection';

// Audit Sessions
export * from '../use-audit-sessions';

// Finding SLA
export * from '../use-finding-sla-config';
