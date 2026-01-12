/**
 * Analytics & Dashboard Hooks
 * 
 * This barrel file exports all hooks related to analytics and dashboards.
 */

// Dashboard Core
export * from '../use-dashboard-stats';
export * from '../use-dashboard-realtime';
export * from '../use-dashboard-drilldown';
export * from '../use-personal-dashboard';

// HSSE Analytics
export * from '../use-hsse-analytics';
export * from '../use-hsse-risk-analytics';
export * from '../use-hsse-escalation-review';

// Executive
export * from '../use-executive-summary';
export * from '../use-executive-comparison';
export * from '../use-executive-ai-insights';

// Drilldown
export * from '../use-drilldown-events';
export * from '../use-quick-action-drilldown';
export * from '../use-quick-action-counts';
export * from '../use-recent-events';
export * from '../use-events-by-location';

// Location Analytics
export * from '../use-location-heatmap';

// KPI
export * from '../use-kpi-indicators';
export * from '../use-kpi-targets-admin';
export * from '../use-kpi-trends';
export * from '../use-kpi-evaluation';

// Top Reporters
export * from '../use-top-reporters';

// Manhours
export * from '../use-manhours';
export * from '../use-manhours-trend';

// SLA
export * from '../use-sla-analytics';
export * from '../use-sla-config';
export * from '../use-sla-dashboard';
export * from '../use-sla-escalation-listener';
