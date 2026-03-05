/**
 * Incident Management Hooks
 * 
 * This barrel file exports all hooks related to incident/event management functionality.
 */

// Core Incident Operations
export * from './use-incidents';
export * from './use-incident-closure';
export * from './use-incident-progression';
export * from './use-incident-confidentiality';

// Incident Dashboard & Metrics
export * from './use-incident-metrics';
export * from './use-incident-type-distribution';
export * from './use-hsse-event-dashboard';

// Incident Details
export * from './use-incident-injuries';
export * from './use-incident-property-damages';
export * from './use-incident-assets';

// Investigation
export * from './use-investigation';
export * from './use-investigation-completeness';
export * from './use-investigation-edit-access';
export * from './use-investigation-sla-config';
export * from '@/hooks/use-investigator-violation';

// Corrective Actions
export * from '@/hooks/use-overdue-actions';

// Root Cause Analysis
export * from '@/hooks/use-rca-ai';
export * from '@/hooks/use-rca-analytics';
export * from '@/hooks/use-effectiveness-monitoring';

// AI & Validation
export * from './use-incident-ai';
export * from './use-incident-ai-validator';

// Evidence & Witnesses
export * from '@/hooks/use-evidence-items';
export * from '@/hooks/use-witness-statements';

// Environmental
export * from '@/hooks/use-environmental-details';
export * from '@/hooks/use-environmental-contamination';

// Legal Review
export * from '@/hooks/use-legal-review';

// HSSE Workflow
export * from './use-hsse-workflow';
export * from './use-hsse-validation';
export * from './use-hsse-validation-dashboard';
export * from './use-hsse-incident-validation';
export * from '@/hooks/use-dept-rep-incident-review';
export * from '@/hooks/use-dept-manager-incident-approval';
export * from '@/hooks/use-clinic-review';
export * from './use-investigation-team';

// Event Categories & Subtypes
export * from '@/hooks/use-active-event-categories';
export * from '@/hooks/use-active-event-subtypes';

// Audit 16 Hooks Move
export * from './use-action-center-stats';
export * from './use-action-dispute';
export * from './use-action-evidence';
export * from './use-action-extensions';
export * from './use-action-sla-config';
export * from './use-inspection-actions';
export * from './use-inspection-analytics';
export * from './use-inspection-categories';
export * from './use-inspection-dashboard';
export * from './use-inspection-schedules';
export * from './use-inspection-sessions';
export * from './use-inspection-uploads';
export * from './use-inspections';
export * from './use-observation-ai-validator';
export * from './use-observation-rejection';
export * from './use-observation-trends';
