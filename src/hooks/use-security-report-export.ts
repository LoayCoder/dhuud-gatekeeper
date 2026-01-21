import { useState } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useDocumentBranding } from './use-document-branding';
import { generateSecuritySummaryPDF } from '@/lib/generate-security-summary-pdf';
import { generateGuardPerformancePDF } from '@/lib/generate-guard-performance-pdf';
import { generateAttendanceExcel } from '@/lib/generate-attendance-excel';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export type ReportType = 'team_summary' | 'individual_guard' | 'attendance_excel';

export interface ReportSections {
  attendance: boolean;
  shifts: boolean;
  training: boolean;
  incidents: boolean;
}

export interface ExportOptions {
  reportType: ReportType;
  startDate: string;
  endDate: string;
  guardId?: string;
  sections?: ReportSections;
  language: 'en' | 'ar';
  isRTL: boolean;
}

interface BrandingConfig {
  headerBgColor: string;
  headerTextColor: string;
  footerBgColor: string;
  footerTextColor: string;
  footerText?: string;
  watermarkText?: string | null;
  watermarkEnabled: boolean;
}

interface TenantData {
  name: string;
  logo_url: string | null;
}

interface ProfileWithRelations {
  tenant?: TenantData | null;
  department?: { name: string } | null;
}

export function useSecurityReportExport() {
  const { t } = useTranslation();
  const [isExporting, setIsExporting] = useState(false);
  const { settings } = useDocumentBranding();

  const exportReport = async (options: ExportOptions) => {
    setIsExporting(true);
    
    try {
      // Get tenant info
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id, tenant:tenants(name, logo_url)')
        .eq('id', user?.id || '')
        .single();
      
      const typedProfile = profile as unknown as ProfileWithRelations;
      const tenantName = typedProfile?.tenant?.name || 'Organization';
      const logoUrl = typedProfile?.tenant?.logo_url || null;

      const branding: BrandingConfig = {
        headerBgColor: settings?.headerBgColor || '#ffffff',
        headerTextColor: settings?.headerTextColor || '#1f2937',
        footerBgColor: settings?.footerBgColor || '#f3f4f6',
        footerTextColor: settings?.footerTextColor || '#6b7280',
        footerText: settings?.footerText || undefined,
        watermarkText: settings?.watermarkText || null,
        watermarkEnabled: settings?.watermarkEnabled || false,
      };

      switch (options.reportType) {
        case 'team_summary':
          await exportTeamSummary(options, tenantName, logoUrl, branding);
          break;
        case 'individual_guard':
          if (options.guardId) {
            await exportGuardPerformance(options, tenantName, logoUrl, branding);
          }
          break;
        case 'attendance_excel':
          await exportAttendance(options);
          break;
      }
      
      toast.success(t('security.exportSuccess', 'Report downloaded successfully'));
    } catch (error) {
      console.error('Export error:', error);
      toast.error(t('security.exportError', 'Failed to generate report'));
    } finally {
      setIsExporting(false);
    }
  };

  return { exportReport, isExporting };
}

async function exportTeamSummary(
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

  // Fetch team summary data
  const { data: metrics } = await supabase
    .from('guard_performance_metrics')
    .select(`
      guard_id,
      patrols_completed,
      patrols_assigned,
      checkpoints_verified,
      checkpoints_missed,
      geofence_violations,
      incidents_reported,
      incidents_resolved,
      overall_score,
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

  // Aggregate data
  const guardMap = new Map<string, { 
    guard_id: string; 
    guard_name: string; 
    avatar_url: string | null;
    patrols: number; 
    scores: number[] 
  }>();
  
  let totalPatrols = 0;
  let totalIncidents = 0;
  let totalViolations = 0;

  for (const m of metrics || []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const guard = m.guard as any;
    const existing = guardMap.get(m.guard_id) || {
      guard_id: m.guard_id,
      guard_name: guard?.full_name || 'Unknown',
      avatar_url: guard?.avatar_url || null,
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
    totalPatrols,
    totalIncidents,
    geofenceViolations: totalViolations,
    avgPerformanceScore: guards.length > 0 
      ? Math.round(guards.reduce((sum, g) => sum + g.avgScore, 0) / guards.length)
      : 0,
    onTimeArrivals,
    lateArrivals,
    totalAttendanceRecords: totalRecords,
    avgHoursWorked: totalRecords > 0 ? Math.round((totalHours / totalRecords) * 10) / 10 : 0,
    performanceDistribution: {
      excellent: guards.filter(g => g.avgScore >= 90).length,
      good: guards.filter(g => g.avgScore >= 80 && g.avgScore < 90).length,
      average: guards.filter(g => g.avgScore >= 70 && g.avgScore < 80).length,
      needsImprovement: guards.filter(g => g.avgScore < 70).length,
    },
    topPerformers: sorted.slice(0, 5).map(g => ({
      guard_id: g.guard_id,
      guard_name: g.guard_name,
      avatar_url: g.avatar_url,
      score: Math.round(g.avgScore),
      patrols: g.patrols,
    })),
    needsAttention: sorted.filter(g => g.avgScore < 70).map(g => ({
      guard_id: g.guard_id,
      guard_name: g.guard_name,
      avatar_url: g.avatar_url,
      score: Math.round(g.avgScore),
    })),
  };

  await generateSecuritySummaryPDF({
    data: summaryData,
    startDate: options.startDate,
    endDate: options.endDate,
    tenantName,
    logoUrl,
    branding,
    isRTL: options.isRTL,
    language: options.language,
  });
}

async function exportGuardPerformance(
  options: ExportOptions, 
  tenantName: string, 
  logoUrl: string | null,
  branding: BrandingConfig
) {
  const guardId = options.guardId!;
  
  // Fetch guard profile
  const { data: profile } = await supabase
    .from('profiles')
    .select(`id, full_name, employee_id, job_title, avatar_url, department:departments(name)`)
    .eq('id', guardId)
    .single();

  const typedProfile = profile as unknown as (typeof profile & { department?: { name: string } });

  // Fetch performance metrics
  const { data: metrics } = await supabase
    .from('guard_performance_metrics')
    .select('*')
    .eq('guard_id', guardId)
    .is('deleted_at', null)
    .gte('metric_date', options.startDate)
    .lte('metric_date', options.endDate);

  // Fetch attendance
  const { data: attendance } = await supabase
    .from('guard_attendance_logs')
    .select(`id, guard_id, check_in_at, check_out_at, late_minutes, overtime_minutes, gps_validated, status, zone:security_zones!guard_attendance_logs_zone_id_fkey(name)`)
    .eq('guard_id', guardId)
    .is('deleted_at', null)
    .gte('check_in_at', options.startDate)
    .lte('check_in_at', options.endDate + 'T23:59:59')
    .order('check_in_at', { ascending: false })
    .limit(20);

  // Fetch shifts
  const { data: shifts } = await supabase
    .from('shift_roster')
    .select(`date, start_date, end_date, acknowledged_at, shift:security_shifts(name, start_time, end_time)`)
    .eq('guard_id', guardId)
    .is('deleted_at', null)
    .gte('start_date', options.startDate)
    .lte('start_date', options.endDate)
    .order('start_date', { ascending: false })
    .limit(10);

  // Calculate aggregated performance
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
      rank: 1,
      totalGuards: 1,
    },
    attendance: (attendance || []).map((a: any) => {
      const checkIn = a.check_in_at ? new Date(a.check_in_at) : null;
      const checkOut = a.check_out_at ? new Date(a.check_out_at) : null;
      const hoursWorked = checkIn && checkOut ? (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60) : null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const zone = a.zone as any;
      return {
        id: a.id,
        guard_id: a.guard_id,
        guard_name: profile?.full_name || 'Unknown',
        employee_id: profile?.employee_id || null,
        date: checkIn ? format(checkIn, 'yyyy-MM-dd') : '',
        zone_name: zone?.name || null,
        check_in: checkIn ? format(checkIn, 'HH:mm') : null,
        check_out: checkOut ? format(checkOut, 'HH:mm') : null,
        hours_worked: hoursWorked ? Math.round(hoursWorked * 10) / 10 : null,
        late_minutes: a.late_minutes || 0,
        overtime_minutes: a.overtime_minutes || 0,
        gps_validated: a.gps_validated || false,
        status: a.status || 'unknown',
      };
    }),
    shifts: (shifts || []).map((s: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const shift = s.shift as any;
      return {
        date: s.start_date || s.date,
        shift_name: shift?.name || 'Unknown Shift',
        start_time: shift?.start_time || '',
        end_time: shift?.end_time || '',
        acknowledged: !!s.acknowledged_at,
      };
    }),
    training: [],
    incidentCount: totalIncidentsReported,
    incidentResolutionRate: Math.round(incidentRate),
  };

  await generateGuardPerformancePDF({
    data: guardData,
    startDate: options.startDate,
    endDate: options.endDate,
    tenantName,
    logoUrl,
    branding,
    sections: options.sections,
    isRTL: options.isRTL,
    language: options.language,
  });
}

async function exportAttendance(options: ExportOptions) {
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
      id,
      guard_id,
      zone_id,
      check_in_at,
      check_out_at,
      late_minutes,
      overtime_minutes,
      gps_validated,
      status,
      guard:profiles!guard_attendance_logs_guard_id_fkey(full_name, employee_id),
      zone:security_zones!guard_attendance_logs_zone_id_fkey(name)
    `)
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .gte('check_in_at', options.startDate)
    .lte('check_in_at', options.endDate + 'T23:59:59')
    .order('check_in_at', { ascending: false });

  const records = (data || []).map((r: any) => {
    const checkIn = r.check_in_at ? new Date(r.check_in_at) : null;
    const checkOut = r.check_out_at ? new Date(r.check_out_at) : null;
    const hoursWorked = checkIn && checkOut ? (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60) : null;
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

  generateAttendanceExcel({
    records,
    filename: `attendance-${options.startDate}-to-${options.endDate}.xlsx`,
    language: options.language,
  });
}
