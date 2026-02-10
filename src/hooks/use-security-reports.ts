import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
      // Fetch performance metrics
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

      // Fetch attendance records
      const { data: attendance } = await supabase
        .from('guard_attendance_logs')
        .select('id, guard_id, late_minutes, check_in_at, check_out_at, status')
        .is('deleted_at', null)
        .gte('check_in_at', startDate)
        .lte('check_in_at', endDate + 'T23:59:59');

      // Aggregate by guard
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

      // Calculate performance distribution
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

      // Top performers
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

      // Attendance stats
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

export function useGuardReportData(guardId: string, startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['guard-report-data', guardId, startDate, endDate],
    queryFn: async () => {
      // Fetch guard profile
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

      // Fetch performance metrics
      const { data: metrics } = await supabase
        .from('guard_performance_metrics')
        .select('*')
        .eq('guard_id', guardId)
        .is('deleted_at', null)
        .gte('metric_date', startDate)
        .lte('metric_date', endDate);

      // Fetch attendance
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

      // Fetch shift roster
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

      // Training data - placeholder since guard_training table may not exist
      const training: any[] = [];

      // Calculate aggregated performance
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

      // Get all guards for ranking
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
        department_name: (profile?.department as any)?.name || null,
        supervisor_name: null, // Would need additional query
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
        attendance: (attendance || []).map((a: any) => {
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
        shifts: (shifts || []).map((s: any) => ({
          date: s.start_date || s.date,
          shift_name: s.shift?.name || 'Unknown Shift',
          start_time: s.shift?.start_time || '',
          end_time: s.shift?.end_time || '',
          acknowledged: !!s.acknowledged_at,
        })),
        training: (training || []).map((t: any) => ({
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
      // Get current user's tenant for isolation
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();
      
      if (!profile?.tenant_id) throw new Error('No tenant found');

      // Get guards from security team members (correct approach via normalized roles)
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

      const guardMap = new Map<string, any>();

      // Add team members
      if (teamMembers) {
        for (const tm of teamMembers) {
          const guard = tm.guard as any;
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

      // Also fetch guards by job_title containing "security" or "guard"
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
      // Get unique supervisors from shift roster
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
          supervisorMap.set(r.supervisor_id, r.supervisor as any);
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

      const guardMap = new Map<string, any>();
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
