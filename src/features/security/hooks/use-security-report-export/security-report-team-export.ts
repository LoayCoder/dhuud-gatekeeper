import { supabase } from '@/integrations/supabase/client';
import { generateSecuritySummaryPDF } from '@/lib/generate-security-summary-pdf';
import type { ExportOptions, BrandingConfig } from './use-security-report-export';

export async function exportTeamSummary(
    options: ExportOptions,
    tenantName: string,
    logoUrl: string | null,
    branding: BrandingConfig
) {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user?.id || '')
        .single();

    const tenantId = profile?.tenant_id;
    if (!tenantId) throw new Error('No tenant found');

    const { data: metrics } = await supabase
        .from('guard_performance_metrics')
        .select(`
      guard_id, patrols_completed, patrols_assigned,
      checkpoints_verified, checkpoints_missed, geofence_violations,
      incidents_reported, incidents_resolved, overall_score,
      guard:profiles!guard_performance_metrics_guard_id_fkey(full_name, avatar_url)
    `)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .gte('metric_date', options.startDate)
        .lte('metric_date', options.endDate);

    const { data: attendance } = await supabase
        .from('guard_attendance_logs')
        .select('id, guard_id, late_minutes, check_in_at, check_out_at, status')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .gte('check_in_at', options.startDate)
        .lte('check_in_at', options.endDate + 'T23:59:59');

    interface GuardSummary {
        guard_id: string;
        guard_name: string;
        avatar_url: string | null;
        patrols: number;
        scores: number[];
    }
    const guardMap = new Map<string, GuardSummary>();
    let totalPatrols = 0, totalIncidents = 0, totalViolations = 0;

    for (const m of metrics || []) {
        const guard = m.guard as { full_name?: string; avatar_url?: string | null } | null;
        const existing = guardMap.get(m.guard_id) || {
            guard_id: m.guard_id, guard_name: guard?.full_name || 'Unknown',
            avatar_url: guard?.avatar_url || null, patrols: 0, scores: [],
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
        avgScore: g.scores.length > 0 ? g.scores.reduce((a, b) => a + b, 0) / g.scores.length : 0,
    }));

    const sorted = [...guards].sort((a, b) => b.avgScore - a.avgScore);
    const totalRecords = attendance?.length || 0;
    const onTimeArrivals = attendance?.filter(a => (a.late_minutes || 0) <= 0).length || 0;
    const lateArrivals = attendance?.filter(a => (a.late_minutes || 0) > 0).length || 0;

    let totalHours = 0;
    for (const a of attendance || []) {
        if (a.check_in_at && a.check_out_at) {
            totalHours += (new Date(a.check_out_at).getTime() - new Date(a.check_in_at).getTime()) / (1000 * 60 * 60);
        }
    }

    const summaryData = {
        activeGuards: guards.length,
        avgAttendanceRate: totalRecords > 0 ? (onTimeArrivals / totalRecords) * 100 : 100,
        totalPatrols, totalIncidents, geofenceViolations: totalViolations,
        avgPerformanceScore: guards.length > 0
            ? Math.round(guards.reduce((sum, g) => sum + g.avgScore, 0) / guards.length) : 0,
        onTimeArrivals, lateArrivals, totalAttendanceRecords: totalRecords,
        avgHoursWorked: totalRecords > 0 ? Math.round((totalHours / totalRecords) * 10) / 10 : 0,
        performanceDistribution: {
            excellent: guards.filter(g => g.avgScore >= 90).length,
            good: guards.filter(g => g.avgScore >= 80 && g.avgScore < 90).length,
            average: guards.filter(g => g.avgScore >= 70 && g.avgScore < 80).length,
            needsImprovement: guards.filter(g => g.avgScore < 70).length,
        },
        topPerformers: sorted.slice(0, 5).map(g => ({
            guard_id: g.guard_id, guard_name: g.guard_name,
            avatar_url: g.avatar_url, score: Math.round(g.avgScore), patrols: g.patrols,
        })),
        needsAttention: sorted.filter(g => g.avgScore < 70).map(g => ({
            guard_id: g.guard_id, guard_name: g.guard_name,
            avatar_url: g.avatar_url, score: Math.round(g.avgScore),
        })),
    };

    await generateSecuritySummaryPDF({
        data: summaryData, startDate: options.startDate, endDate: options.endDate,
        tenantName, logoUrl, branding, isRTL: options.isRTL, language: options.language,
    });
}
