import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
  return useQuery({
    queryKey: ['guard-activity', guardId, limit],
    queryFn: async (): Promise<GuardActivity[]> => {
      if (!guardId) return [];

      const activities: GuardActivity[] = [];
      const now = new Date();
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      const client = supabase as any;

      // Fetch shift check-ins/check-outs
      const { data: shifts } = await client
        .from('shift_assignments')
        .select(`
          id,
          check_in_at,
          check_out_at,
          shift:shifts(name, name_ar)
        `)
        .eq('guard_id', guardId)
        .gte('shift_date', new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('shift_date', { ascending: false })
        .limit(10);

      if (shifts) {
        for (const shift of shifts as any[]) {
          const shiftData = shift.shift as { name?: string; name_ar?: string } | null;
          if (shift.check_in_at) {
            activities.push({
              id: `checkin-${shift.id}`,
              type: 'check_in',
              timestamp: shift.check_in_at,
              title: 'Checked In',
              titleAr: 'تسجيل دخول',
              description: shiftData?.name || 'Shift',
              descriptionAr: shiftData?.name_ar || 'المناوبة',
              severity: 'success',
            });
          }
          if (shift.check_out_at) {
            activities.push({
              id: `checkout-${shift.id}`,
              type: 'check_out',
              timestamp: shift.check_out_at,
              title: 'Checked Out',
              titleAr: 'تسجيل خروج',
              description: shiftData?.name || 'Shift',
              descriptionAr: shiftData?.name_ar || 'المناوبة',
              severity: 'info',
            });
          }
        }
      }

      // Fetch location updates (last 24 hours, sampled)
      const { data: locations } = await client
        .from('guard_locations')
        .select('id, recorded_at, accuracy, battery_level, is_within_zone')
        .eq('guard_id', guardId)
        .gte('recorded_at', last24Hours)
        .order('recorded_at', { ascending: false })
        .limit(20);

      if (locations) {
        // Sample every 5th location to avoid flooding the timeline
        const sampledLocations = (locations as any[]).filter((_, i) => i % 5 === 0);
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

      // Fetch patrol scan logs
      const { data: patrols } = await client
        .from('patrol_scan_logs')
        .select(`
          id,
          scanned_at,
          scan_status,
          checkpoint:patrol_checkpoints(name, name_ar)
        `)
        .eq('guard_id', guardId)
        .gte('scanned_at', last24Hours)
        .order('scanned_at', { ascending: false })
        .limit(20);

      if (patrols) {
        for (const patrol of patrols as any[]) {
          const checkpoint = patrol.checkpoint as { name?: string; name_ar?: string } | null;
          const isSuccess = patrol.scan_status === 'success' || patrol.scan_status === 'on_time';
          activities.push({
            id: `patrol-${patrol.id}`,
            type: 'patrol_scan',
            timestamp: patrol.scanned_at,
            title: isSuccess ? 'Patrol Checkpoint Scanned' : 'Patrol Scan Issue',
            titleAr: isSuccess ? 'تم مسح نقطة التفتيش' : 'مشكلة في المسح',
            description: checkpoint?.name || 'Checkpoint',
            descriptionAr: checkpoint?.name_ar || 'نقطة التفتيش',
            severity: isSuccess ? 'success' : 'warning',
            metadata: { status: patrol.scan_status },
          });
        }
      }

      // Fetch alerts
      const { data: alerts } = await client
        .from('geofence_alerts')
        .select('id, created_at, alert_type, severity, alert_message, acknowledged_at, resolved_at')
        .eq('guard_id', guardId)
        .gte('created_at', last24Hours)
        .order('created_at', { ascending: false })
        .limit(10);

      if (alerts) {
        for (const alert of alerts as any[]) {
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
    enabled: !!guardId,
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
