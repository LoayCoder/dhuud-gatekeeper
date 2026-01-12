/**
 * Security Management Hooks
 * 
 * This barrel file exports all hooks related to security operations functionality.
 */

// Security Dashboard
export * from '../use-security-dashboard';
export * from '../use-security-stats';
export * from '../use-security-score';

// Gate Operations
export * from '../use-gate-entries';
export * from '../use-gate-guard-stats';

// Security Zones
export * from '../use-security-zones';
export * from '../use-current-zone';

// Security Team
export * from '../use-security-team';
// Note: use-security-teams excluded to avoid duplicate exports with use-security-team
export * from '../use-guard-site-assignments';

// Guards
export * from '../use-guard-activity';
export * from '../use-guard-attendance';
export * from '../use-guard-performance';
export * from '../use-guard-training';

// Shifts & Roster
export * from '../use-security-shifts';
export * from '../use-shift-roster';
export * from '../use-shift-handovers';
export * from '../use-shift-swap-requests';

// Patrols
export * from '../use-security-patrols';
export * from '../use-offline-patrol-queue';

// Tracking
export * from '../use-live-tracking';
export * from '../use-realtime-tracking';
export * from '../use-tracking-settings';
export * from '../use-geofence-escalation';

// CCTV
export * from '../use-cctv-cameras';

// Emergency
export * from '../use-emergency-alerts';
export * from '../use-emergency-protocols';
export * from '../use-emergency-protocol-templates';
export * from '../use-security-emergency-actions';

// Blacklist
export * from '../use-security-blacklist';

// Audit & Notifications
export * from '../use-security-audit-log';
export * from '../use-security-push-notifications';

// ANPR
export * from '../use-anpr-recognition';
