import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type ActivityType = 'check_in' | 'check_out' | 'location_update' | 'patrol_scan' | 'alert';

export interface GuardActivity {
  id: string;
  type: ActivityType;
  timestamp: string;
  title: string;
  titleAr?: string;
  description?: string;
  descriptionAr?: string;
  metadata?: Record<string, unknown>;
  severity?: 'info' | 'warning' | 'critical' | 'success';
}

export function useGuardActivity(guardId: string | null, limit: number = 50) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ['guard-activity', tenantId, guardId, limit],
    queryFn: async (): Promise<GuardActivity[]> => {
      if (!guardId || !tenantId) return [];

      const activities: GuardActivity[] = [];
      const now = new Date();
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

      // Fetch shift check-ins/check-outs from shift_roster (tenant-scoped)
      const { data: shifts } = await supabase
        .from('shift_roster')
        .select(`
          id,
          check_in_time,
          check_out_time,
          shift:security_shifts(shift_name)
        `)
        .eq('tenant_id', tenantId)
        .eq('guard_id', guardId)
        .gte('roster_date', new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .is('deleted_at', null)
        .order('roster_date', { ascending: false })
        .limit(10);

      if (shifts) {
        for (const shift of shifts as unknown[]) {
          const shiftData = shift.shift as { shift_name?: string } | null;
          if (shift.check_in_time) {
            activities.push({
              id: `checkin-${shift.id}`,
              type: 'check_in',
              timestamp: shift.check_in_time,
              title: 'Checked In',
              titleAr: 'تسجيل دخول',
              description: shiftData?.shift_name || 'Shift',
              descriptionAr: shiftData?.shift_name || 'المناوبة',
              severity: 'success',
            });
          }
          if (shift.check_out_time) {
            activities.push({
              id: `checkout-${shift.id}`,
              type: 'check_out',
              timestamp: shift.check_out_time,
              title: 'Checked Out',
              titleAr: 'تسجيل خروج',
              description: shiftData?.shift_name || 'Shift',
              descriptionAr: shiftData?.shift_name || 'المناوبة',
              severity: 'info',
            });
          }
        }
      }

      // Fetch location updates (last 24 hours, sampled) - guard_tracking_history
      const { data: locations } = await supabase
        .from('guard_tracking_history')
        .select('id, recorded_at, accuracy, battery_level, is_within_zone')
        .eq('tenant_id', tenantId)
        .eq('guard_id', guardId)
        .gte('recorded_at', last24Hours)
        .is('deleted_at', null)
        .order('recorded_at', { ascending: false })
        .limit(20);

      if (locations) {
        // Sample every 5th location to avoid flooding the timeline
        const sampledLocations = (locations as unknown[]).filter((_, i) => i % 5 === 0);
        for (const loc of sampledLocations) {
          activities.push({
            id: `loc-${loc.id}`,
            type: 'location_update',
            timestamp: loc.recorded_at,
            title: loc.is_within_zone ? 'Location Updated (In Zone)' : 'Location Updated (Outside Zone)',
            titleAr: loc.is_within_zone ? 'تحديث الموقع (داخل المنطقة)' : 'تحديث الموقع (خارج المنطقة)',
            description: `Accuracy: ${loc.accuracy?.toFixed(0) || '?'}m${loc.battery_level ? `, Battery: ${loc.battery_level}%` : ''}`,
            descriptionAr: `الدقة: ${loc.accuracy?.toFixed(0) || '?'}م${loc.battery_level ? `، البطارية: ${loc.battery_level}%` : ''}`,
            severity: loc.is_within_zone ? 'info' : 'warning',
            metadata: { accuracy: loc.accuracy, battery: loc.battery_level },
          });
        }
      }

      // Fetch security patrols by this guard
      const { data: patrols } = await supabase
        .from('security_patrols')
        .select('id, actual_start, actual_end, status, checkpoints_visited, checkpoints_total')
        .eq('tenant_id', tenantId)
        .eq('patrol_officer_id', guardId)
        .gte('actual_start', last24Hours)
        .is('deleted_at', null)
        .order('actual_start', { ascending: false })
        .limit(20);

      if (patrols) {
        for (const patrol of patrols) {
          if (patrol.actual_start) {
            const completed = patrol.status === 'completed';
            activities.push({
              id: `patrol-${patrol.id}`,
              type: 'patrol_scan',
              timestamp: patrol.actual_start,
              title: completed ? 'Patrol Completed' : 'Patrol Started',
              titleAr: completed ? 'اكتمل التفتيش' : 'بدأ التفتيش',
              description: `${patrol.checkpoints_visited || 0}/${patrol.checkpoints_total || 0} checkpoints`,
              descriptionAr: `${patrol.checkpoints_visited || 0}/${patrol.checkpoints_total || 0} نقاط تفتيش`,
              severity: completed ? 'success' : 'info',
              metadata: { 
                status: patrol.status,
                checkpoints: `${patrol.checkpoints_visited}/${patrol.checkpoints_total}`
              },
            });
          }
        }
      }

      // Fetch alerts
      const { data: alerts } = await supabase
        .from('geofence_alerts')
        .select('id, created_at, alert_type, severity, alert_message, acknowledged_at, resolved_at')
        .eq('tenant_id', tenantId)
        .eq('guard_id', guardId)
        .gte('created_at', last24Hours)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(10);

      if (alerts) {
        for (const alert of alerts as unknown[]) {
          const alertSeverity = alert.severity === 'critical' ? 'critical' : 
                               alert.severity === 'high' ? 'warning' : 'info';
          activities.push({
            id: `alert-${alert.id}`,
            type: 'alert',
            timestamp: alert.created_at,
            title: getAlertTitle(alert.alert_type),
            titleAr: getAlertTitleAr(alert.alert_type),
            description: alert.alert_message || '',
            severity: alertSeverity as 'info' | 'warning' | 'critical',
            metadata: { 
              acknowledged: !!alert.acknowledged_at, 
              resolved: !!alert.resolved_at,
              alertType: alert.alert_type,
            },
          });
        }
      }

      // Sort by timestamp descending
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      return activities.slice(0, limit);
    },
    enabled: !!guardId && !!tenantId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

function getAlertTitle(alertType: string): string {
  switch (alertType) {
    case 'gps_disabled': return 'GPS Disabled';
    case 'zone_exit': return 'Left Assigned Zone';
    case 'zone_entry': return 'Entered Zone';
    case 'sos': return 'SOS Alert';
    case 'low_battery': return 'Low Battery';
    default: return 'Alert';
  }
}

function getAlertTitleAr(alertType: string): string {
  switch (alertType) {
    case 'gps_disabled': return 'تم إيقاف GPS';
    case 'zone_exit': return 'غادر المنطقة المحددة';
    case 'zone_entry': return 'دخل المنطقة';
    case 'sos': return 'تنبيه طوارئ';
    case 'low_battery': return 'بطارية منخفضة';
    default: return 'تنبيه';
  }
}
