/**
 * Shared security domain types for typed Supabase results.
 * Used across hooks and components to eliminate `as any` casts.
 */

// ─── Patrol Types ────────────────────────────────────────────────

export interface PatrolRoute {
  id: string;
  name: string;
  site_id: string | null;
  is_active: boolean;
}

export interface PatrolCheckpoint {
  id: string;
  name: string;
  route_id: string;
  order_index: number;
  latitude: number | null;
  longitude: number | null;
}

export interface PatrolLog {
  id: string;
  session_id: string;
  checkpoint_id: string;
  scanned_at: string;
  notes: string | null;
  gps_validated: boolean;
  linked_incident_id: string | null;
  photo_paths: string[] | null;
  checkpoint?: PatrolCheckpoint | null;
}

export interface PatrolGuardProfile {
  id: string;
  full_name: string | null;
  avatar_url?: string | null;
}

export interface PatrolSession {
  id: string;
  route_id: string;
  guard_id: string;
  actual_start: string | null;
  actual_end: string | null;
  status: string;
  route: PatrolRoute | null;
  guard: PatrolGuardProfile | null;
  logs: PatrolLog[];
}

// ─── Guard Types ─────────────────────────────────────────────────

export interface GuardJoinedProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  employee_id: string | null;
  job_title: string | null;
}

export interface TeamJoined {
  name: string | null;
}

export interface SecurityTeamMemberJoined {
  guard_id: string;
  guard: GuardJoinedProfile | null;
  team: TeamJoined | null;
}

// ─── Performance / Report Types ──────────────────────────────────

export interface GuardPerformanceMetricJoined {
  guard_id: string;
  patrols_completed: number | null;
  patrols_assigned: number | null;
  checkpoints_verified: number | null;
  checkpoints_missed: number | null;
  geofence_violations: number | null;
  shift_punctuality_minutes: number | null;
  incidents_reported: number | null;
  incidents_resolved: number | null;
  overall_score: number | null;
  guard: { full_name: string | null; avatar_url: string | null } | null;
}

export interface AttendanceLogRow {
  id: string;
  guard_id: string;
  check_in_at: string | null;
  check_out_at: string | null;
  late_minutes: number | null;
  status: string | null;
  guard?: { full_name: string | null; employee_id: string | null } | null;
  zone?: { zone_name: string | null } | null;
}

// ─── Zone Types (extended from generated) ────────────────────────

export interface SecurityZoneWithRisk {
  id: string;
  zone_name: string;
  zone_code: string | null;
  zone_type: string | null;
  risk_level: string | null;
  site_id: string | null;
  is_active: boolean;
  tenant_id: string;
  polygon_coords: unknown;
  geofence_radius_meters: number | null;
}

// ─── Shift Types ─────────────────────────────────────────────────

export interface SecurityShiftRow {
  id: string;
  shift_name: string;
  shift_code: string | null;
  start_time: string;
  end_time: string;
  is_overnight: boolean | null;
  is_active: boolean;
}

// ─── Emergency Action Types ──────────────────────────────────────

export interface EmergencyActionRow {
  id: string;
  action_type: string;
  reason: string | null;
  affected_users_count: number | null;
  created_at: string;
  tenant_id: string;
}

// ─── Geofence Alert Types ────────────────────────────────────────

export interface GeofenceAlertPayload {
  severity: string | null;
  alert_message: string | null;
  guard_id: string | null;
}

// ─── Contractor Access Log Types ─────────────────────────────────

export interface ContractorAccessContractor {
  full_name: string | null;
  photo_path: string | null;
  company_name: string | null;
}

// ─── LooseSupabaseClient for ungenerated tables ──────────────────

export interface LooseSupabaseClient {
  from: (table: string) => {
    select: (query?: string, options?: { count?: 'exact'; head?: boolean }) => {
      eq: (...args: unknown[]) => LooseQueryChain;
      is: (...args: unknown[]) => LooseQueryChain;
      gt: (...args: unknown[]) => LooseQueryChain;
      gte: (...args: unknown[]) => LooseQueryChain;
      in: (...args: unknown[]) => LooseQueryChain;
      then: (resolve: (value: { data: unknown[] | null; error: unknown; count: number | null }) => void) => void;
    } & LooseQueryChain;
    update: (data: Record<string, unknown>) => {
      eq: (...args: unknown[]) => LooseQueryChain;
      then: (resolve: (value: { data: unknown; error: unknown }) => void) => void;
    } & LooseQueryChain;
  };
}

interface LooseQueryChain {
  eq: (...args: unknown[]) => LooseQueryChain;
  is: (...args: unknown[]) => LooseQueryChain;
  gt: (...args: unknown[]) => LooseQueryChain;
  gte: (...args: unknown[]) => LooseQueryChain;
  in: (...args: unknown[]) => LooseQueryChain;
  count: number | null;
  data: unknown;
  error: unknown;
  then: (resolve: (value: { data: unknown; error: unknown; count: number | null }) => void) => void;
}
