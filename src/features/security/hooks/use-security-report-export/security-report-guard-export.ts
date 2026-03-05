import { supabase } from '@/integrations/supabase/client';
import { generateGuardPerformancePDF } from '@/lib/generate-guard-performance-pdf';
import { generateAttendanceExcel } from '@/lib/generate-attendance-excel';
import { format } from 'date-fns';
import type { ExportOptions, BrandingConfig } from './use-security-report-export';

interface AttendanceRecord {
    id?: string;
    guard_id?: string;
    check_in_at?: string;
    check_out_at?: string;
    late_minutes?: number;
    overtime_minutes?: number;
    gps_validated?: boolean;
    status?: string;
    zone?: { name?: string };
    guard?: { full_name?: string; employee_id?: string };
}

interface ShiftRecord {
    date?: string;
    start_date?: string;
    acknowledged_at?: string;
    shift?: { name?: string; start_time?: string; end_time?: string };
}

export async function exportGuardPerformance(
    options: ExportOptions,
    tenantName: string,
    logoUrl: string | null,
    branding: BrandingConfig
) {
    const guardId = options.guardId!;

    const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, employee_id, job_title, avatar_url, department:departments(name)')
        .eq('id', guardId)
        .single();

    const typedProfile = profile as unknown as (typeof profile & { department?: { name: string } });

    const { data: metrics } = await supabase
        .from('guard_performance_metrics')
        .select('*')
        .eq('guard_id', guardId)
        .is('deleted_at', null)
        .gte('metric_date', options.startDate)
        .lte('metric_date', options.endDate);

    const { data: attendance } = await supabase
        .from('guard_attendance_logs')
        .select('id, guard_id, check_in_at, check_out_at, late_minutes, overtime_minutes, gps_validated, status, zone:security_zones!guard_attendance_logs_zone_id_fkey(name)')
        .eq('guard_id', guardId)
        .is('deleted_at', null)
        .gte('check_in_at', options.startDate)
        .lte('check_in_at', options.endDate + 'T23:59:59')
        .order('check_in_at', { ascending: false })
        .limit(20);

    const { data: shifts } = await supabase
        .from('shift_roster')
        .select('date, start_date, end_date, acknowledged_at, shift:security_shifts(name, start_time, end_time)')
        .eq('guard_id', guardId)
        .is('deleted_at', null)
        .gte('start_date', options.startDate)
        .lte('start_date', options.endDate)
        .order('start_date', { ascending: false })
        .limit(10);

    let totalPatrolsCompleted = 0, totalPatrolsAssigned = 0;
    let totalCheckpointsVerified = 0, totalCheckpointsMissed = 0;
    let totalViolations = 0, totalPunctuality = 0;
    let totalIncidentsReported = 0, totalIncidentsResolved = 0;
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
    const patrolRate = totalPatrolsAssigned > 0 ? (totalPatrolsCompleted / totalPatrolsAssigned) * 100 : 100;
    const totalCP = totalCheckpointsVerified + totalCheckpointsMissed;
    const cpAccuracy = totalCP > 0 ? (totalCheckpointsVerified / totalCP) * 100 : 100;
    const punctScore = Math.max(0, 100 - Math.abs(totalPunctuality / count) * 5);
    const incidentRate = totalIncidentsReported > 0 ? (totalIncidentsResolved / totalIncidentsReported) * 100 : 100;
    const geoCompl = Math.max(0, 100 - totalViolations * 10);

    const overallScore = scores.length > 0
        ? scores.reduce((a, b) => a + b, 0) / scores.length
        : (patrolRate + cpAccuracy + punctScore + incidentRate + geoCompl) / 5;

    const guardData = {
        guard_id: guardId,
        guard_name: profile?.full_name || 'Unknown',
        employee_id: profile?.employee_id || null,
        job_title: profile?.job_title || 'Security Officer',
        avatar_url: profile?.avatar_url || null,
        department_name: typedProfile?.department?.name || null,
        supervisor_name: null,
        assigned_zone: null,
        performance: {
            overall_score: Math.round(overallScore),
            patrol_completion_rate: Math.round(patrolRate),
            checkpoint_accuracy: Math.round(cpAccuracy),
            punctuality_score: Math.round(punctScore),
            incident_response_rate: Math.round(incidentRate),
            geofence_compliance: Math.round(geoCompl),
            trend: 'stable' as const,
            rank: 1, totalGuards: 1,
        },
        attendance: (attendance as AttendanceRecord[] || []).map((a) => {
            const checkIn = a.check_in_at ? new Date(a.check_in_at) : null;
            const checkOut = a.check_out_at ? new Date(a.check_out_at) : null;
            const hoursWorked = checkIn && checkOut ? (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60) : null;
            return {
                id: a.id, guard_id: a.guard_id,
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
        shifts: (shifts as ShiftRecord[] || []).map((s) => ({
            date: s.start_date || s.date,
            shift_name: s.shift?.name || 'Unknown Shift',
            start_time: s.shift?.start_time || '',
            end_time: s.shift?.end_time || '',
            acknowledged: !!s.acknowledged_at,
        })),
        training: [],
        incidentCount: totalIncidentsReported,
        incidentResolutionRate: Math.round(incidentRate),
    };

    await generateGuardPerformancePDF({
        data: guardData, startDate: options.startDate, endDate: options.endDate,
        tenantName, logoUrl, branding, sections: options.sections,
        isRTL: options.isRTL, language: options.language,
    });
}

export async function exportAttendance(options: ExportOptions) {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user?.id || '')
        .single();

    const tenantId = profile?.tenant_id;
    if (!tenantId) throw new Error('No tenant found');

    const { data } = await supabase
        .from('guard_attendance_logs')
        .select(`
      id, guard_id, zone_id, check_in_at, check_out_at,
      late_minutes, overtime_minutes, gps_validated, status,
      guard:profiles!guard_attendance_logs_guard_id_fkey(full_name, employee_id),
      zone:security_zones!guard_attendance_logs_zone_id_fkey(name)
    `)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .gte('check_in_at', options.startDate)
        .lte('check_in_at', options.endDate + 'T23:59:59')
        .order('check_in_at', { ascending: false });

    const records = (data as AttendanceRecord[] || []).map((r) => {
        const checkIn = r.check_in_at ? new Date(r.check_in_at) : null;
        const checkOut = r.check_out_at ? new Date(r.check_out_at) : null;
        const hoursWorked = checkIn && checkOut ? (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60) : null;
        return {
            id: r.id, guard_id: r.guard_id,
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

    generateAttendanceExcel({
        records,
        filename: `attendance-${options.startDate}-to-${options.endDate}.xlsx`,
        language: options.language,
    });
}
