import { differenceInHours } from 'date-fns';

export interface RosterAssignment {
    id: string;
    guard_id: string;
    zone_id: string;
    shift_id: string;
    roster_date: string;
    supervisor_id: string | null;
    status: string | null;
    notes: string | null;
    check_in_time: string | null;
    check_out_time: string | null;
    acknowledged_at: string | null;
    assigned_at: string | null;
    auto_acknowledged: boolean | null;
    guard?: { full_name: string | null };
    supervisor?: { full_name: string | null };
    zone?: { zone_name: string | null; zone_code: string | null };
    shift?: { shift_name: string | null; start_time: string | null; end_time: string | null };
}

export interface UpcomingShift {
    id: string;
    roster_date: string;
    status: string | null;
    acknowledged_at: string | null;
    assigned_at: string | null;
    auto_acknowledged: boolean | null;
    zone: { zone_name: string | null; zone_code: string | null } | null;
    shift: { shift_name: string | null; start_time: string | null; end_time: string | null } | null;
    supervisor: { full_name: string | null } | null;
}

export interface CreateRosterAssignmentParams {
    guard_id: string;
    zone_id: string;
    shift_id: string;
    start_date: string;
    end_date: string;
    excluded_days?: number[]; // 0=Sunday, 5=Friday, 6=Saturday
    supervisor_id?: string;
    notes?: string;
    status?: string;
}

export interface AssignTeamToShiftParams {
    team_id: string;
    zone_id: string;
    shift_id: string;
    start_date: string;
    end_date: string;
    excluded_days?: number[];
}

// Utility functions
export function getAcknowledgmentStatus(shift: {
    acknowledged_at: string | null;
    assigned_at: string | null;
    auto_acknowledged: boolean | null;
}): 'acknowledged' | 'auto_acknowledged' | 'pending' | 'expired' {
    if (shift.acknowledged_at) {
        return shift.auto_acknowledged ? 'auto_acknowledged' : 'acknowledged';
    }

    if (shift.assigned_at) {
        const hoursSinceAssigned = differenceInHours(new Date(), new Date(shift.assigned_at));
        if (hoursSinceAssigned >= 12) {
            return 'expired'; // Should be auto-acknowledged by edge function
        }
    }

    return 'pending';
}

export function getTimeUntilAutoAcknowledge(assignedAt: string | null): number | null {
    if (!assignedAt) return null;
    const hoursRemaining = 12 - differenceInHours(new Date(), new Date(assignedAt));
    return hoursRemaining > 0 ? hoursRemaining : 0;
}
