import type { Database } from '@/integrations/supabase/types';

type PatrolRouteRow = Database['public']['Tables']['security_patrol_routes']['Row'];
type PatrolCheckpointRow = Database['public']['Tables']['patrol_checkpoints']['Row'];
type SecurityPatrolRow = Database['public']['Tables']['security_patrols']['Row'];
type PatrolCheckpointLogRow = Database['public']['Tables']['patrol_checkpoint_logs']['Row'];

export type PatrolRoute = PatrolRouteRow;
export type PatrolCheckpoint = PatrolCheckpointRow;
export type SecurityPatrol = SecurityPatrolRow & { route?: { name: string } | null; guard?: { full_name: string } | null; };
export type PatrolCheckpointLog = PatrolCheckpointLogRow;
export type { PatrolRouteRow, PatrolCheckpointRow };
