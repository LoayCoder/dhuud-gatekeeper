import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format, subDays } from 'date-fns';

export interface AttendanceExportFilters {
    startDate: string;
    endDate: string;
    guardIds?: string[];
    status?: string;
    zoneId?: string;
}

export interface AttendanceRecord {
    id: string;
    guard_id: string;
    guard_name: string;
    employee_id: string | null;
    date: string;
    zone_name: string | null;
    check_in: string | null;
    check_out: string | null;
    hours_worked: number | null;
    late_minutes: number;
    overtime_minutes: number;
    gps_validated: boolean;
    status: string;
}

export interface TeamSummaryData {
    activeGuards: number;
    avgAttendanceRate: number;
    totalPatrols: number;
    totalIncidents: number;
    geofenceViolations: number;
    avgPerformanceScore: number;
    onTimeArrivals: number;
    lateArrivals: number;
    totalAttendanceRecords: number;
    avgHoursWorked: number;
    performanceDistribution: {
        excellent: number;
        good: number;
        average: number;
        needsImprovement: number;
    };
    topPerformers: Array<{
        guard_id: string;
        guard_name: string;
        avatar_url: string | null;
        score: number;
        patrols: number;
    }>;
    needsAttention: Array<{
        guard_id: string;
        guard_name: string;
        avatar_url: string | null;
        score: number;
    }>;
}

export interface GuardReportData {
    guard_id: string;
    guard_name: string;
    employee_id: string | null;
    job_title: string | null;
    avatar_url: string | null;
    department_name: string | null;
    supervisor_name: string | null;
    assigned_zone: string | null;
    performance: {
        overall_score: number;
        patrol_completion_rate: number;
        checkpoint_accuracy: number;
        punctuality_score: number;
        incident_response_rate: number;
        geofence_compliance: number;
        trend: 'up' | 'down' | 'stable';
        rank: number;
        totalGuards: number;
    };
    attendance: AttendanceRecord[];
    shifts: Array<{
        date: string;
        shift_name: string;
        start_time: string;
        end_time: string;
        acknowledged: boolean;
    }>;
    training: Array<{
        name: string;
        status: string;
        expiry_date: string | null;
        is_expired: boolean;
    }>;
    incidentCount: number;
    incidentResolutionRate: number;
}
