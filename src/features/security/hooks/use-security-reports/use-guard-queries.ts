import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import type { AttendanceRecord, GuardReportData } from './types';

export function useGuardReportData(guardId: string, startDate: string, endDate: string) {
    return useQuery({
        queryKey: ['guard-report-data', guardId, startDate, endDate],
        queryFn: async () => {
            const { data: profile } = await supabase
                .from('profiles')
                .select(`
          id,
          full_name,
          employee_id,
          job_title,
          avatar_url,
          department:departments(name)
        `)
                .eq('id', guardId)
                .single();

            const { data: metrics } = await supabase
                .from('guard_performance_metrics')
                .select('*')
                .eq('guard_id', guardId)
                .is('deleted_at', null)
                .gte('metric_date', startDate)
                .lte('metric_date', endDate);

            const { data: attendance } = await supabase
                .from('guard_attendance_logs')
                .select(`
          id,
          guard_id,
          check_in_at,
          check_out_at,
          late_minutes,
          overtime_minutes,
          gps_validated,
          status,
          zone:security_zones!guard_attendance_logs_zone_id_fkey(zone_name)
        `)
                .eq('guard_id', guardId)
                .is('deleted_at', null)
                .gte('check_in_at', startDate)
                .lte('check_in_at', endDate + 'T23:59:59')
                .order('check_in_at', { ascending: false })
                .limit(20);

            const { data: shifts } = await supabase
                .from('shift_roster')
                .select(`
          date,
          start_date,
          end_date,
          acknowledged_at,
          shift:security_shifts(name, start_time, end_time)
        `)
                .eq('guard_id', guardId)
                .is('deleted_at', null)
                .gte('start_date', startDate)
                .lte('start_date', endDate)
                .order('start_date', { ascending: false })
                .limit(10);

            const training: unknown[] = [];

            let totalPatrolsCompleted = 0;
            let totalPatrolsAssigned = 0;
            let totalCheckpointsVerified = 0;
            let totalCheckpointsMissed = 0;
            let totalViolations = 0;
            let totalPunctuality = 0;
            let totalIncidentsReported = 0;
            let totalIncidentsResolved = 0;
            const scores: number[] = [];

            for (const m of metrics || []) {
                totalPatrolsCompleted += m.patrols_completed || 0;
                totalPatrolsAssigned += m.patrols_assigned || 0;
                totalCheckpointsVerified += m.checkpoints_verified || 0;
                totalCheckpointsMissed += m.checkpoints_missed || 0;
                totalViolations += m.geofence_violations || 0;
                totalPunctuality += m.shift_punctuality_minutes || 0;
                totalIncidentsReported += m.incidents_reported || 0;
                totalIncidentsResolved += m.incidents_resolved || 0;
                if (m.overall_score) scores.push(Number(m.overall_score));
            }

            const count = metrics?.length || 1;
            const patrolCompletionRate = totalPatrolsAssigned > 0
                ? (totalPatrolsCompleted / totalPatrolsAssigned) * 100
                : 100;
            const totalCheckpoints = totalCheckpointsVerified + totalCheckpointsMissed;
            const checkpointAccuracy = totalCheckpoints > 0
                ? (totalCheckpointsVerified / totalCheckpoints) * 100
                : 100;
            const avgPunctuality = totalPunctuality / count;
            const punctualityScore = Math.max(0, 100 - Math.abs(avgPunctuality) * 5);
            const incidentResponseRate = totalIncidentsReported > 0
                ? (totalIncidentsResolved / totalIncidentsReported) * 100
                : 100;
            const geofenceCompliance = Math.max(0, 100 - totalViolations * 10);

            const overallScore = scores.length > 0
                ? scores.reduce((a, b) => a + b, 0) / scores.length
                : (patrolCompletionRate + checkpointAccuracy + punctualityScore + incidentResponseRate + geofenceCompliance) / 5;

            const { data: allGuards } = await supabase
                .from('guard_performance_metrics')
                .select('guard_id, overall_score')
                .is('deleted_at', null)
                .gte('metric_date', startDate)
                .lte('metric_date', endDate);

            const guardScores = new Map<string, number[]>();
            for (const g of allGuards || []) {
                const existing = guardScores.get(g.guard_id) || [];
                if (g.overall_score) existing.push(Number(g.overall_score));
                guardScores.set(g.guard_id, existing);
            }

            const guardAvgScores = Array.from(guardScores.entries())
                .map(([id, sc]) => ({
                    id,
                    avg: sc.length > 0 ? sc.reduce((a, b) => a + b, 0) / sc.length : 0,
                }))
                .sort((a, b) => b.avg - a.avg);

            const rank = guardAvgScores.findIndex(g => g.id === guardId) + 1;

            const reportData: GuardReportData = {
                guard_id: guardId,
                guard_name: profile?.full_name || 'Unknown',
                employee_id: profile?.employee_id || null,
                job_title: profile?.job_title || 'Security Officer',
                avatar_url: profile?.avatar_url || null,
                department_name: (profile?.department as unknown)?.name || null,
                supervisor_name: null,
                assigned_zone: null,
                performance: {
                    overall_score: Math.round(overallScore),
                    patrol_completion_rate: Math.round(patrolCompletionRate),
                    checkpoint_accuracy: Math.round(checkpointAccuracy),
                    punctuality_score: Math.round(punctualityScore),
                    incident_response_rate: Math.round(incidentResponseRate),
                    geofence_compliance: Math.round(geofenceCompliance),
                    trend: 'stable',
                    rank: rank || 1,
                    totalGuards: guardAvgScores.length || 1,
                },
                attendance: (attendance || []).map((a: unknown) => {
                    const checkIn = a.check_in_at ? new Date(a.check_in_at) : null;
                    const checkOut = a.check_out_at ? new Date(a.check_out_at) : null;
                    const hoursWorked = checkIn && checkOut
                        ? (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60)
                        : null;
                    return {
                        id: a.id,
                        guard_id: a.guard_id,
                        guard_name: profile?.full_name || 'Unknown',
                        employee_id: profile?.employee_id || null,
                        date: checkIn ? format(checkIn, 'yyyy-MM-dd') : '',
                        zone_name: a.zone?.name || null,
                        check_in: checkIn ? format(checkIn, 'HH:mm') : null,
                        check_out: checkOut ? format(checkOut, 'HH:mm') : null,
                        hours_worked: hoursWorked ? Math.round(hoursWorked * 10) / 10 : null,
                        late_minutes: a.late_minutes || 0,
                        overtime_minutes: a.overtime_minutes || 0,
                        gps_validated: a.gps_validated || false,
                        status: a.status || 'unknown',
                    };
                }),
                shifts: (shifts || []).map((s: unknown) => ({
                    date: s.start_date || s.date,
                    shift_name: s.shift?.name || 'Unknown Shift',
                    start_time: s.shift?.start_time || '',
                    end_time: s.shift?.end_time || '',
                    acknowledged: !!s.acknowledged_at,
                })),
                training: (training || []).map((t: unknown) => ({
                    name: t.training?.name || 'Unknown',
                    status: t.status || 'pending',
                    expiry_date: t.expiry_date,
                    is_expired: t.expiry_date ? new Date(t.expiry_date) < new Date() : false,
                })),
                incidentCount: totalIncidentsReported,
                incidentResolutionRate: Math.round(incidentResponseRate),
            };

            return reportData;
        },
        enabled: !!guardId && !!startDate && !!endDate,
    });
}

export function useSecurityGuardsList() {
    return useQuery({
        queryKey: ['security-guards-list'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { data: profile } = await supabase
                .from('profiles')
                .select('tenant_id')
                .eq('id', user.id)
                .single();

            if (!profile?.tenant_id) throw new Error('No tenant found');

            const { data: teamMembers } = await supabase
                .from('security_team_members')
                .select(`
          guard_id,
          guard:profiles!security_team_members_guard_id_fkey(
            id, full_name, avatar_url, employee_id, job_title
          )
        `)
                .eq('tenant_id', profile.tenant_id)
                .is('deleted_at', null);

            const guardMap = new Map<string, { id: string; full_name: string; avatar_url: string | null; employee_id: string | null; job_title: string | null }>();

            if (teamMembers) {
                for (const tm of teamMembers) {
                    const guard = tm.guard as unknown;
                    if (guard?.id) {
                        guardMap.set(guard.id, {
                            id: guard.id,
                            full_name: guard.full_name || 'Unknown',
                            avatar_url: guard.avatar_url,
                            employee_id: guard.employee_id,
                            job_title: guard.job_title,
                        });
                    }
                }
            }

            const { data: securityProfiles } = await supabase
                .from('profiles')
                .select('id, full_name, avatar_url, employee_id, job_title')
                .eq('tenant_id', profile.tenant_id)
                .is('deleted_at', null)
                .or('job_title.ilike.%security%,job_title.ilike.%guard%,job_title.ilike.%حارس%,job_title.ilike.%أمن%');

            if (securityProfiles) {
                for (const p of securityProfiles) {
                    if (!guardMap.has(p.id)) {
                        guardMap.set(p.id, p);
                    }
                }
            }

            return Array.from(guardMap.values()).sort((a, b) =>
                (a.full_name || '').localeCompare(b.full_name || '')
            );
        },
    });
}

export function useSecuritySupervisors() {
    return useQuery({
        queryKey: ['security-supervisors'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('shift_roster')
                .select(`
          supervisor_id,
          supervisor:profiles!shift_roster_supervisor_id_fkey(id, full_name, avatar_url)
        `)
                .not('supervisor_id', 'is', null)
                .is('deleted_at', null);

            if (error) throw error;

            const supervisorMap = new Map<string, { id: string; full_name: string; avatar_url: string | null }>();
            for (const r of data || []) {
                if (r.supervisor && !supervisorMap.has(r.supervisor_id)) {
                    supervisorMap.set(r.supervisor_id, r.supervisor as unknown);
                }
            }

            return Array.from(supervisorMap.values());
        },
    });
}

export function useSecurityShifts() {
    return useQuery({
        queryKey: ['security-shifts'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('security_shifts')
                .select('id, name, start_time, end_time')
                .is('deleted_at', null)
                .order('start_time');

            if (error) throw error;
            return data || [];
        },
    });
}

export function useSecurityZones() {
    return useQuery({
        queryKey: ['security-zones'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('security_zones')
                .select('id, zone_name')
                .is('deleted_at', null)
                .order('zone_name');

            if (error) throw error;
            return data || [];
        },
    });
}

export function useGuardsBySupervisor(supervisorId: string | null) {
    return useQuery({
        queryKey: ['guards-by-supervisor', supervisorId],
        queryFn: async () => {
            if (!supervisorId) return [];

            const { data, error } = await supabase
                .from('shift_roster')
                .select(`
          guard_id,
          guard:profiles!shift_roster_guard_id_fkey(id, full_name, avatar_url, employee_id)
        `)
                .eq('supervisor_id', supervisorId)
                .is('deleted_at', null);

            if (error) throw error;

            const guardMap = new Map<string, { id: string; full_name: string; avatar_url: string | null; employee_id: string | null }>();
            for (const r of data || []) {
                if (r.guard && !guardMap.has(r.guard_id)) {
                    guardMap.set(r.guard_id, r.guard);
                }
            }

            return Array.from(guardMap.values());
        },
        enabled: !!supervisorId,
    });
}
