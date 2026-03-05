import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import type { AttendanceExportFilters, AttendanceRecord, TeamSummaryData } from './types';

export function useAttendanceExport(filters: AttendanceExportFilters) {
    return useQuery({
        queryKey: ['attendance-export', filters],
        queryFn: async () => {
            let query = supabase
                .from('guard_attendance_logs')
                .select(`
          id,
          guard_id,
          zone_id,
          check_in_at,
          check_out_at,
          late_minutes,
          overtime_minutes,
          gps_validated,
          status,
          guard:profiles!guard_attendance_logs_guard_id_fkey(
            full_name,
            employee_id
          ),
          zone:security_zones!guard_attendance_logs_zone_id_fkey(
            zone_name
          )
        `)
                .is('deleted_at', null)
                .gte('check_in_at', filters.startDate)
                .lte('check_in_at', filters.endDate + 'T23:59:59')
                .order('check_in_at', { ascending: false });

            if (filters.guardIds && filters.guardIds.length > 0) {
                query = query.in('guard_id', filters.guardIds);
            }

            if (filters.status) {
                query = query.eq('status', filters.status);
            }

            if (filters.zoneId) {
                query = query.eq('zone_id', filters.zoneId);
            }

            const { data, error } = await query;
            if (error) throw error;

            const records: AttendanceRecord[] = (data || []).map((r: any) => {
                const checkIn = r.check_in_at ? new Date(r.check_in_at) : null;
                const checkOut = r.check_out_at ? new Date(r.check_out_at) : null;
                const hoursWorked = checkIn && checkOut
                    ? (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60)
                    : null;

                return {
                    id: r.id,
                    guard_id: r.guard_id,
                    guard_name: r.guard?.full_name || 'Unknown',
                    employee_id: r.guard?.employee_id || null,
                    date: checkIn ? format(checkIn, 'yyyy-MM-dd') : '',
                    zone_name: r.zone?.name || null,
                    check_in: checkIn ? format(checkIn, 'HH:mm') : null,
                    check_out: checkOut ? format(checkOut, 'HH:mm') : null,
                    hours_worked: hoursWorked ? Math.round(hoursWorked * 10) / 10 : null,
                    late_minutes: r.late_minutes || 0,
                    overtime_minutes: r.overtime_minutes || 0,
                    gps_validated: r.gps_validated || false,
                    status: r.status || 'unknown',
                };
            });

            return records;
        },
        enabled: !!filters.startDate && !!filters.endDate,
    });
}

export function useSecurityTeamSummary(startDate: string, endDate: string) {
    return useQuery({
        queryKey: ['security-team-summary', startDate, endDate],
        queryFn: async () => {
            const { data: metrics } = await supabase
                .from('guard_performance_metrics')
                .select(`
          guard_id,
          patrols_completed,
          patrols_assigned,
          checkpoints_verified,
          checkpoints_missed,
          geofence_violations,
          shift_punctuality_minutes,
          incidents_reported,
          incidents_resolved,
          overall_score,
          guard:profiles!guard_performance_metrics_guard_id_fkey(full_name, avatar_url)
        `)
                .is('deleted_at', null)
                .gte('metric_date', startDate)
                .lte('metric_date', endDate);

            const { data: attendance } = await supabase
                .from('guard_attendance_logs')
                .select('id, guard_id, late_minutes, check_in_at, check_out_at, status')
                .is('deleted_at', null)
                .gte('check_in_at', startDate)
                .lte('check_in_at', endDate + 'T23:59:59');

            const guardMap = new Map<string, {
                guard_id: string;
                guard_name: string;
                avatar_url: string | null;
                patrols: number;
                scores: number[];
            }>();

            let totalPatrols = 0;
            let totalIncidents = 0;
            let totalViolations = 0;

            for (const m of metrics || []) {
                const existing = guardMap.get(m.guard_id) || {
                    guard_id: m.guard_id,
                    guard_name: (m.guard as any)?.full_name || 'Unknown',
                    avatar_url: (m.guard as any)?.avatar_url || null,
                    patrols: 0,
                    scores: [],
                };
                existing.patrols += m.patrols_completed || 0;
                if (m.overall_score) existing.scores.push(Number(m.overall_score));
                guardMap.set(m.guard_id, existing);

                totalPatrols += m.patrols_completed || 0;
                totalIncidents += m.incidents_reported || 0;
                totalViolations += m.geofence_violations || 0;
            }

            const guards = Array.from(guardMap.values()).map(g => ({
                ...g,
                avgScore: g.scores.length > 0
                    ? g.scores.reduce((a, b) => a + b, 0) / g.scores.length
                    : 0,
            }));

            const distribution = {
                excellent: guards.filter(g => g.avgScore >= 90).length,
                good: guards.filter(g => g.avgScore >= 80 && g.avgScore < 90).length,
                average: guards.filter(g => g.avgScore >= 70 && g.avgScore < 80).length,
                needsImprovement: guards.filter(g => g.avgScore < 70).length,
            };

            const sorted = [...guards].sort((a, b) => b.avgScore - a.avgScore);
            const topPerformers = sorted.slice(0, 5).map(g => ({
                guard_id: g.guard_id,
                guard_name: g.guard_name,
                avatar_url: g.avatar_url,
                score: Math.round(g.avgScore),
                patrols: g.patrols,
            }));

            const needsAttention = sorted.filter(g => g.avgScore < 70).map(g => ({
                guard_id: g.guard_id,
                guard_name: g.guard_name,
                avatar_url: g.avatar_url,
                score: Math.round(g.avgScore),
            }));

            const totalRecords = attendance?.length || 0;
            const onTimeArrivals = attendance?.filter(a => (a.late_minutes || 0) <= 0).length || 0;
            const lateArrivals = attendance?.filter(a => (a.late_minutes || 0) > 0).length || 0;

            let totalHours = 0;
            for (const a of attendance || []) {
                if (a.check_in_at && a.check_out_at) {
                    const hours = (new Date(a.check_out_at).getTime() - new Date(a.check_in_at).getTime()) / (1000 * 60 * 60);
                    totalHours += hours;
                }
            }

            const avgHoursWorked = totalRecords > 0 ? totalHours / totalRecords : 0;
            const avgScore = guards.length > 0
                ? guards.reduce((sum, g) => sum + g.avgScore, 0) / guards.length
                : 0;

            const summary: TeamSummaryData = {
                activeGuards: guards.length,
                avgAttendanceRate: totalRecords > 0 ? (onTimeArrivals / totalRecords) * 100 : 100,
                totalPatrols,
                totalIncidents,
                geofenceViolations: totalViolations,
                avgPerformanceScore: Math.round(avgScore),
                onTimeArrivals,
                lateArrivals,
                totalAttendanceRecords: totalRecords,
                avgHoursWorked: Math.round(avgHoursWorked * 10) / 10,
                performanceDistribution: distribution,
                topPerformers,
                needsAttention,
            };

            return summary;
        },
        enabled: !!startDate && !!endDate,
    });
}
