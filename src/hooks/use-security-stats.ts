import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, subDays, format } from 'date-fns';

interface SecurityStats {
  activeGuards: number;
  totalGuards: number;
  visitorsToday: number;
  visitorsOnSite: number;
  openAlerts: number;
  patrolsCompleted: number;
  patrolCompletionRate: number;
  visitorTrend: Array<{ date: string; count: number }>;
  patrolTrend: Array<{ date: string; rate: number }>;
  breachTrend: Array<{ date: string; count: number }>;
  alertsByZone: Array<{ zone: string; count: number }>;
  recentActivity: Array<{
    type: 'alert' | 'patrol' | 'visitor';
    description: string;
    location: string;
    timestamp: string;
    status?: string;
  }>;
}

async function fetchSecurityStats(): Promise<SecurityStats> {
  const today = startOfDay(new Date());
  const sevenDaysAgo = subDays(today, 7);

  // Fetch active guards (those with recent location updates in last hour)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: activeGuardsData } = await supabase
    .from('guard_tracking_history')
    .select('guard_id')
    .gte('recorded_at', oneHourAgo);
  
  const activeGuards = new Set(activeGuardsData?.map(g => g.guard_id) ?? []).size;

  // Total guards count (from shift roster today)
  const { count: totalGuards } = await supabase
    .from('shift_roster')
    .select('*', { count: 'exact', head: true })
    .gte('roster_date', format(today, 'yyyy-MM-dd'))
    .lte('roster_date', format(today, 'yyyy-MM-dd'))
    .is('deleted_at', null);

  // Visitors today
  const { count: visitorsToday } = await supabase
    .from('gate_entry_logs')
    .select('*', { count: 'exact', head: true })
    .gte('entry_time', today.toISOString())
    .is('deleted_at', null);

  // Visitors currently on site (entry but no exit)
  const { count: visitorsOnSite } = await supabase
    .from('gate_entry_logs')
    .select('*', { count: 'exact', head: true })
    .gte('entry_time', today.toISOString())
    .is('exit_time', null)
    .is('deleted_at', null);

  // Open alerts (not acknowledged and not resolved)
  const { count: openAlerts } = await supabase
    .from('geofence_alerts')
    .select('*', { count: 'exact', head: true })
    .is('acknowledged_at', null)
    .is('resolved_at', null)
    .is('deleted_at', null);

  // Patrols completed today - use security_patrols table with actual_start
  const { data: patrolsData } = await supabase
    .from('security_patrols')
    .select('status')
    .gte('actual_start', today.toISOString())
    .is('deleted_at', null);

  const patrolsCompleted = patrolsData?.filter(p => p.status === 'completed').length ?? 0;
  const totalPatrols = patrolsData?.length ?? 0;
  const patrolCompletionRate = totalPatrols > 0 ? Math.round((patrolsCompleted / totalPatrols) * 100) : 0;

  // Visitor trend (last 7 days) - batch query
  const { data: visitorData } = await supabase
    .from('gate_entry_logs')
    .select('entry_time')
    .gte('entry_time', sevenDaysAgo.toISOString())
    .is('deleted_at', null);

  const visitorByDay: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const date = subDays(today, i);
    visitorByDay[format(date, 'yyyy-MM-dd')] = 0;
  }
  
  visitorData?.forEach(v => {
    const day = format(new Date(v.entry_time), 'yyyy-MM-dd');
    if (visitorByDay[day] !== undefined) {
      visitorByDay[day]++;
    }
  });

  const visitorTrend = Object.entries(visitorByDay).map(([date, count]) => ({
    date: format(new Date(date), 'EEE'),
    count
  }));

  // Patrol trend (last 7 days) - batch query
  const { data: allPatrols } = await supabase
    .from('security_patrols')
    .select('status, actual_start')
    .gte('actual_start', sevenDaysAgo.toISOString())
    .is('deleted_at', null);

  const patrolByDay: Record<string, { completed: number; total: number }> = {};
  for (let i = 6; i >= 0; i--) {
    const date = subDays(today, i);
    patrolByDay[format(date, 'yyyy-MM-dd')] = { completed: 0, total: 0 };
  }
  
  allPatrols?.forEach(p => {
    if (p.actual_start) {
      const day = format(new Date(p.actual_start), 'yyyy-MM-dd');
      if (patrolByDay[day]) {
        patrolByDay[day].total++;
        if (p.status === 'completed') {
          patrolByDay[day].completed++;
        }
      }
    }
  });

  const patrolTrend = Object.entries(patrolByDay).map(([date, data]) => ({
    date: format(new Date(date), 'EEE'),
    rate: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0
  }));

  // Breach trend (last 7 days) - fetch geofence alerts
  const { data: breachData } = await supabase
    .from('geofence_alerts')
    .select('created_at')
    .gte('created_at', sevenDaysAgo.toISOString())
    .is('deleted_at', null);

  const breachByDay: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const date = subDays(today, i);
    breachByDay[format(date, 'yyyy-MM-dd')] = 0;
  }
  
  breachData?.forEach(b => {
    if (b.created_at) {
      const day = format(new Date(b.created_at), 'yyyy-MM-dd');
      if (breachByDay[day] !== undefined) {
        breachByDay[day]++;
      }
    }
  });

  const breachTrend = Object.entries(breachByDay).map(([date, count]) => ({
    date: format(new Date(date), 'EEE'),
    count
  }));

  // Alerts by zone
  const { data: alertsData } = await supabase
    .from('geofence_alerts')
    .select(`
      zone_id,
      security_zones(zone_name)
    `)
    .is('deleted_at', null)
    .limit(100);

  const zoneAlertCounts: Record<string, number> = {};
  alertsData?.forEach(alert => {
    const zoneName = (alert.security_zones as unknown as { zone_name: string })?.zone_name || 'Unknown';
    zoneAlertCounts[zoneName] = (zoneAlertCounts[zoneName] || 0) + 1;
  });

  const alertsByZone = Object.entries(zoneAlertCounts)
    .map(([zone, count]) => ({ zone, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Recent activity
  const recentActivity: SecurityStats['recentActivity'] = [];

  // Get recent alerts
  const { data: recentAlerts } = await supabase
    .from('geofence_alerts')
    .select(`
      id,
      alert_type,
      acknowledged_at,
      resolved_at,
      created_at,
      security_zones(zone_name)
    `)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(5);

  recentAlerts?.forEach(alert => {
    const status = alert.resolved_at ? 'resolved' : (alert.acknowledged_at ? 'acknowledged' : 'pending');
    recentActivity.push({
      type: 'alert',
      description: `Geofence ${alert.alert_type?.replace('_', ' ')}`,
      location: (alert.security_zones as unknown as { zone_name: string })?.zone_name || 'Unknown Zone',
      timestamp: alert.created_at ?? new Date().toISOString(),
      status
    });
  });

  // Get recent patrols
  const { data: recentPatrols } = await supabase
    .from('security_patrols')
    .select(`
      id,
      status,
      actual_start,
      security_patrol_routes(name)
    `)
    .is('deleted_at', null)
    .order('actual_start', { ascending: false })
    .limit(5);

  recentPatrols?.forEach(patrol => {
    recentActivity.push({
      type: 'patrol',
      description: `Patrol ${patrol.status}`,
      location: (patrol.security_patrol_routes as unknown as { name: string })?.name || 'Unknown Route',
      timestamp: patrol.actual_start ?? new Date().toISOString(),
      status: patrol.status ?? undefined
    });
  });

  // Sort by timestamp
  recentActivity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return {
    activeGuards,
    totalGuards: totalGuards ?? 0,
    visitorsToday: visitorsToday ?? 0,
    visitorsOnSite: visitorsOnSite ?? 0,
    openAlerts: openAlerts ?? 0,
    patrolsCompleted,
    patrolCompletionRate,
    visitorTrend,
    patrolTrend,
    breachTrend,
    alertsByZone,
    recentActivity: recentActivity.slice(0, 10)
  };
}

export function useSecurityStats() {
  const query = useQuery({
    queryKey: ['security-stats'],
    queryFn: fetchSecurityStats,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: 1000 * 60 * 5, // Auto-refresh every 5 minutes
  });

  return {
    stats: query.data,
    isLoading: query.isLoading,
    refetch: query.refetch
  };
}
