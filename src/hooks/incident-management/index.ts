/**
 * Incident Management Hooks
 * 
 * This barrel file exports all hooks related to incident/event management functionality.
 */

// Core Incident Operations
export * from '../use-incidents';
export * from '../use-incident-closure';
export * from '../use-incident-progression';
export * from '../use-incident-confidentiality';

// Incident Dashboard & Metrics
export * from '../use-incident-metrics';
export * from '../use-incident-type-distribution';
export * from '../use-hsse-event-dashboard';

// Incident Details
export * from '../use-incident-injuries';
export * from '../use-incident-property-damages';
export * from '../use-incident-assets';

// Investigation
export * from '../use-investigation';
export * from '../use-investigation-completeness';
export * from '../use-investigation-edit-access';
export * from '../use-investigation-sla-config';
export * from '../use-investigator-violation';

// Corrective Actions
export * from '../use-overdue-actions';
export * from '../use-action-evidence';
export * from '../use-action-extensions';
export * from '../use-action-sla-config';

// Root Cause Analysis
export * from '../use-rca-ai';
export * from '../use-rca-analytics';
export * from '../use-effectiveness-monitoring';

// AI & Validation
export * from '../use-incident-ai';
export * from '../use-incident-ai-validator';
export * from '../use-observation-ai-validator';
export * from '../use-observation-rejection';
export * from '../use-observation-trends';

// Evidence & Witnesses
export * from '../use-evidence-items';
export * from '../use-witness-statements';

// Environmental
export * from '../use-environmental-details';
export * from '../use-environmental-contamination';

// Legal Review
export * from '../use-legal-review';

// HSSE Workflow
export * from '../use-hsse-workflow';
export * from '../use-hsse-validation';
export * from '../use-hsse-validation-dashboard';
export * from '../use-hsse-incident-validation';
export * from '../use-dept-rep-incident-review';
export * from '../use-dept-manager-incident-approval';
export * from '../use-clinic-review';
export * from '../use-investigation-team';

// Event Categories & Subtypes
export * from '../use-active-event-categories';
export * from '../use-active-event-subtypes';
