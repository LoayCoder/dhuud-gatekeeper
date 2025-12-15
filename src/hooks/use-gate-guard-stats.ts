import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfDay, format, subHours } from 'date-fns';

export interface GateGuardStats {
  onSite: number;
  visitorsToday: number;
  activeWorkers: number;
  openAlerts: number;
  hourlyTrend: Array<{ hour: string; entries: number; exits: number }>;
  entryTypeBreakdown: Array<{ type: string; count: number; color: string }>;
}

export interface GateAlert {
  id: string;
  type: 'expired_permit' | 'blacklist_match' | 'induction_expired' | 'geofence_breach' | 'pending_approval';
  severity: 'warning' | 'critical' | 'info';
  title: string;
  description: string;
  timestamp: string;
  personName?: string;
  actionRequired?: boolean;
}

async function fetchGateGuardStats(tenantId: string): Promise<GateGuardStats> {
  const today = startOfDay(new Date());
  const todayStr = today.toISOString();

  // Parallel fetch all stats
  const [
    visitorsOnSite,
    visitorsToday,
    contractorWorkersOnSite,
    openAlerts,
    hourlyData,
  ] = await Promise.all([
    // Visitors currently on site (entry but no exit today)
    supabase
      .from('gate_entry_logs')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .gte('entry_time', todayStr)
      .is('exit_time', null)
      .is('deleted_at', null),

    // Total visitors today
    supabase
      .from('gate_entry_logs')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .gte('entry_time', todayStr)
      .is('deleted_at', null),

    // Active contractor workers on site
    supabase
      .from('contractor_access_logs')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .gte('entry_time', todayStr)
      .is('exit_time', null)
      .is('deleted_at', null),

    // Open alerts
    supabase
      .from('geofence_alerts')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .is('acknowledged_at', null)
      .is('resolved_at', null)
      .is('deleted_at', null),

    // Hourly entry/exit data for today
    supabase
      .from('gate_entry_logs')
      .select('entry_time, exit_time')
      .eq('tenant_id', tenantId)
      .gte('entry_time', todayStr)
      .is('deleted_at', null),
  ]);

  // Calculate hourly trend
  const hourlyTrend: GateGuardStats['hourlyTrend'] = [];
  const currentHour = new Date().getHours();
  
  for (let h = 0; h <= currentHour; h++) {
    const hourStr = `${h.toString().padStart(2, '0')}:00`;
    let entries = 0;
    let exits = 0;

    hourlyData.data?.forEach(entry => {
      const entryHour = new Date(entry.entry_time).getHours();
      if (entryHour === h) entries++;
      if (entry.exit_time) {
        const exitHour = new Date(entry.exit_time).getHours();
        if (exitHour === h) exits++;
      }
    });

    hourlyTrend.push({ hour: hourStr, entries, exits });
  }

  // Calculate entry type breakdown
  const entryTypeCounts: Record<string, number> = {};
  hourlyData.data?.forEach(entry => {
    // Since we don't have entry_type in this query, we'll categorize differently
    entryTypeCounts['visitors'] = (entryTypeCounts['visitors'] || 0) + 1;
  });

  // Add contractor workers count
  entryTypeCounts['contractors'] = contractorWorkersOnSite.count || 0;

  const entryTypeBreakdown: GateGuardStats['entryTypeBreakdown'] = [
    { type: 'Visitors', count: visitorsToday.count || 0, color: 'hsl(var(--chart-1))' },
    { type: 'Contractors', count: contractorWorkersOnSite.count || 0, color: 'hsl(var(--chart-2))' },
  ];

  const totalOnSite = (visitorsOnSite.count || 0) + (contractorWorkersOnSite.count || 0);

  return {
    onSite: totalOnSite,
    visitorsToday: visitorsToday.count || 0,
    activeWorkers: contractorWorkersOnSite.count || 0,
    openAlerts: openAlerts.count || 0,
    hourlyTrend,
    entryTypeBreakdown,
  };
}

async function fetchGateAlerts(tenantId: string): Promise<GateAlert[]> {
  const alerts: GateAlert[] = [];

  // Fetch geofence breach alerts
  const { data: geofenceAlerts } = await supabase
    .from('geofence_alerts')
    .select(`
      id, alert_type, created_at,
      guard:profiles!geofence_alerts_guard_id_fkey(full_name),
      security_zones(zone_name)
    `)
    .eq('tenant_id', tenantId)
    .is('acknowledged_at', null)
    .is('resolved_at', null)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(10);

  geofenceAlerts?.forEach(alert => {
    const guardName = (alert.guard as { full_name: string } | null)?.full_name || 'Unknown Guard';
    const zoneName = (alert.security_zones as { zone_name: string } | null)?.zone_name || 'Unknown Zone';
    
    alerts.push({
      id: alert.id,
      type: 'geofence_breach',
      severity: 'critical',
      title: 'Geofence Breach Detected',
      description: `${guardName} outside ${zoneName}`,
      timestamp: alert.created_at || new Date().toISOString(),
      personName: guardName,
      actionRequired: true,
    });
  });

  // Fetch recent blacklist entries
  const { data: blacklistMatches } = await supabase
    .from('security_blacklist')
    .select('id, full_name, reason, listed_at')
    .eq('tenant_id', tenantId)
    .gte('listed_at', subHours(new Date(), 24).toISOString())
    .limit(5);

  blacklistMatches?.forEach(match => {
    alerts.push({
      id: match.id,
      type: 'blacklist_match',
      severity: 'critical',
      title: 'Blacklisted Person Alert',
      description: match.reason || 'Person is on security blacklist',
      timestamp: match.listed_at || new Date().toISOString(),
      personName: match.full_name,
      actionRequired: true,
    });
  });

  // Fetch pending gate pass approvals
  const { data: pendingPasses, count: pendingCount } = await supabase
    .from('material_gate_passes')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('status', 'pending')
    .is('deleted_at', null);

  if (pendingCount && pendingCount > 0) {
    alerts.push({
      id: 'pending-passes',
      type: 'pending_approval',
      severity: 'info',
      title: 'Pending Gate Pass Approvals',
      description: `${pendingCount} gate pass${pendingCount > 1 ? 'es' : ''} awaiting approval`,
      timestamp: new Date().toISOString(),
      actionRequired: true,
    });
  }

  return alerts.sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}

export function useGateGuardStats() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ['gate-guard-stats', tenantId],
    queryFn: () => fetchGateGuardStats(tenantId!),
    enabled: !!tenantId,
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 30, // Auto-refresh every 30 seconds
  });
}

export function useGateAlerts() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ['gate-alerts', tenantId],
    queryFn: () => fetchGateAlerts(tenantId!),
    enabled: !!tenantId,
    staleTime: 1000 * 15, // 15 seconds
    refetchInterval: 1000 * 15, // Auto-refresh every 15 seconds
  });
}
