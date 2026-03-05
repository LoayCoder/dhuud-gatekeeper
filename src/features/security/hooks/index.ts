/**
 * Security Management Hooks
 * 
 * This barrel file exports all hooks related to security operations functionality.
 */

// Security Dashboard
export * from '@/hooks/use-security-dashboard';
export * from '@/hooks/use-security-stats';
export * from '@/hooks/use-security-score';

// Gate Operations
export * from './use-gate-entries';
export * from './use-gate-guard-stats';

// Security Zones
export * from '@/hooks/use-security-zones';
export * from '@/hooks/use-current-zone';

// Security Team
export * from '@/hooks/use-security-team';
// Note: use-security-teams excluded to avoid duplicate exports with use-security-team
export * from '@/hooks/use-guard-site-assignments';

// Guards
export * from '@/hooks/use-guard-activity';
export * from '@/hooks/use-guard-attendance';
export * from '@/hooks/use-guard-performance';
export * from '@/hooks/use-guard-training';

// Shifts & Roster
export * from '@/hooks/use-security-shifts';
export * from '@/hooks/use-shift-roster';
export * from '@/hooks/use-shift-handovers';
export * from '@/hooks/use-shift-swap-requests';

// Patrols
export * from '@/hooks/use-security-patrols';
export * from '@/hooks/use-offline-patrol-queue';

// Tracking
export * from '@/hooks/use-live-tracking';
export * from '@/hooks/use-realtime-tracking';
export * from '@/hooks/use-tracking-settings';
export * from '@/hooks/use-geofence-escalation';

// CCTV
export * from '@/hooks/use-cctv-cameras';

// Emergency
export * from '@/hooks/use-emergency-alerts';
export * from '@/hooks/use-emergency-protocols';
export * from '@/hooks/use-emergency-protocol-templates';
export * from '@/hooks/use-security-emergency-actions';

// Blacklist
export * from '@/hooks/use-security-blacklist';

// Audit & Notifications
export * from '@/hooks/use-security-audit-log';
export * from '@/hooks/use-security-push-notifications';

// ANPR
export * from '@/hooks/use-anpr-recognition';
