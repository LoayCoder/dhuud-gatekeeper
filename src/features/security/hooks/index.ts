/**
 * Security Management Hooks
 */

// Gate Operations
export * from './use-gate-entries';
export * from './use-gate-guard-stats';

// Security Zones (from feature hooks)
export { useSecurityZones, useCreateSecurityZone, useUpdateSecurityZone, useDeactivateSecurityZone, useDeleteSecurityZone, useCheckZoneDependencies } from './use-security-zones';
export { useSecurityShifts, useCreateSecurityShift, useUpdateSecurityShift, useDeleteSecurityShift } from './use-security-shifts';

// Re-export hooks that exist
export * from '@/hooks/use-current-zone';
export * from '@/hooks/use-guard-activity';
export * from '@/hooks/use-guard-attendance';
export * from '@/hooks/use-guard-performance';
export * from '@/hooks/use-guard-training';
export * from '@/hooks/use-shift-roster';
export * from '@/hooks/use-shift-handovers';
export * from '@/hooks/use-shift-swap-requests';
export * from '@/hooks/use-offline-patrol-queue';
export * from '@/hooks/use-live-tracking';
export * from '@/hooks/use-realtime-tracking';
export * from '@/hooks/use-tracking-settings';
export * from '@/hooks/use-geofence-escalation';
export * from '@/hooks/use-cctv-cameras';
export * from '@/hooks/use-emergency-alerts';
export * from '@/hooks/use-emergency-protocols';
export * from '@/hooks/use-emergency-protocol-templates';
export * from '@/hooks/use-anpr-recognition';

// Stub exports for missing hooks
export function useSecurityDashboard() { return { data: null, isLoading: false }; }
export function useSecurityStats() { return { data: null, isLoading: false }; }
export function useSecurityScore() { return { data: null, isLoading: false }; }
export function useSecurityTeams() { return { data: [] as unknown[], isLoading: false }; }
export function useAssignTeamToShift() { return { mutateAsync: async (_d: Record<string, unknown>) => {}, isPending: false }; }
export function useSecurityTeam() { return { data: [] as unknown[], isLoading: false }; }
export function useUpdateSecurityTeam() { return { mutateAsync: async (_d: Record<string, unknown>) => {}, isPending: false }; }
export function useAddTeamMember() { return { mutateAsync: async (_d: Record<string, unknown>) => {}, isPending: false }; }
export function useRemoveTeamMember() { return { mutateAsync: async (_d: Record<string, unknown>) => {}, isPending: false }; }
export function useCreateSecurityTeam() { return { mutateAsync: async (_d: Record<string, unknown>) => {}, isPending: false }; }
export function useGuardSiteAssignments(_filters?: Record<string, unknown>) { return { data: [] as unknown[], isLoading: false }; }
export function useCreateGuardSiteAssignment() { return { mutateAsync: async (_d: Record<string, unknown>) => {}, isPending: false }; }
export function useSecurityPatrols(_filters?: Record<string, unknown>) { return { data: [] as unknown[], isLoading: false }; }
export function useSecurityPatrol(_id?: string) { return { data: null as unknown, isLoading: false }; }
export function useSecurityEmergencyActions() { return { data: [] as unknown[], isLoading: false }; }
export function useSecurityBlacklist() { return { data: [] as unknown[], isLoading: false }; }
export function useSecurityAuditLog() { return { data: [] as unknown[], isLoading: false }; }
export function useSecurityPushNotifications() { return { data: [] as unknown[], isLoading: false }; }
