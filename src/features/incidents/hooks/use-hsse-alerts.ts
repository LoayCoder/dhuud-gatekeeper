import { useMemo } from "react";

export interface HSSEAlert {
  id: string;
  type: 'critical_spike' | 'overdue_rate' | 'hotspot' | 'severity_trend' | 'sla_breach';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  affectedArea?: string;
  count?: number;
  threshold?: number;
  timestamp: Date;
}

interface UseHSSEAlertsParams {
  incidents: any[];
  actions: any[];
  inspections?: any[];
}

export function useHSSEAlerts({ incidents, actions, inspections = [] }: UseHSSEAlertsParams) {
  const alerts = useMemo(() => {
    const detectedAlerts: HSSEAlert[] = [];
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Alert 1: Critical incidents spike (3+ in 7 days)
    const recentCritical = incidents.filter(i => 
      i.severity === 'critical' && 
      new Date(i.created_at) >= sevenDaysAgo
    );
    if (recentCritical.length >= 3) {
      detectedAlerts.push({
        id: 'critical_spike_7d',
        type: 'critical_spike',
        severity: 'critical',
        title: 'Critical Incident Spike',
        description: `${recentCritical.length} critical incidents in the last 7 days`,
        count: recentCritical.length,
        threshold: 3,
        timestamp: now,
      });
    }

    // Alert 2: High overdue action rate (>25%)
    const activeActions = actions.filter(a => 
      a.status !== 'completed' && a.status !== 'verified' && a.status !== 'cancelled'
    );
    const overdueActions = activeActions.filter(a => 
      a.due_date && new Date(a.due_date) < now
    );
    const overdueRate = activeActions.length > 0 
      ? (overdueActions.length / activeActions.length) * 100 
      : 0;
    
    if (overdueRate > 25 && overdueActions.length >= 5) {
      detectedAlerts.push({
        id: 'overdue_rate_high',
        type: 'overdue_rate',
        severity: 'warning',
        title: 'High Overdue Rate',
        description: `${overdueRate.toFixed(0)}% of actions are overdue (${overdueActions.length} total)`,
        count: overdueActions.length,
        threshold: 25,
        timestamp: now,
      });
    }

    // Alert 3: Location hotspot (5+ incidents in same location in 30 days)
    const recentIncidents = incidents.filter(i => 
      new Date(i.created_at) >= thirtyDaysAgo
    );
    const locationCounts: Record<string, { count: number; name: string }> = {};
    recentIncidents.forEach(i => {
      const locId = i.branch_id || i.site_id || 'unknown';
      const locName = i.branch?.name || i.site?.name || 'Unknown Location';
      if (!locationCounts[locId]) {
        locationCounts[locId] = { count: 0, name: locName };
      }
      locationCounts[locId].count++;
    });

    Object.entries(locationCounts).forEach(([locId, data]) => {
      if (data.count >= 5) {
        detectedAlerts.push({
          id: `hotspot_${locId}`,
          type: 'hotspot',
          severity: 'warning',
          title: 'Location Hotspot',
          description: `${data.name} has ${data.count} incidents in the last 30 days`,
          affectedArea: data.name,
          count: data.count,
          threshold: 5,
          timestamp: now,
        });
      }
    });

    // Alert 4: Severity trend increase
    const firstHalfIncidents = incidents.filter(i => {
      const date = new Date(i.created_at);
      return date >= thirtyDaysAgo && date < new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
    });
    const secondHalfIncidents = incidents.filter(i => {
      const date = new Date(i.created_at);
      return date >= new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
    });

    const firstHalfCritical = firstHalfIncidents.filter(i => 
      i.severity === 'critical' || i.severity === 'high'
    ).length;
    const secondHalfCritical = secondHalfIncidents.filter(i => 
      i.severity === 'critical' || i.severity === 'high'
    ).length;

    if (secondHalfCritical > firstHalfCritical * 1.5 && secondHalfCritical >= 3) {
      detectedAlerts.push({
        id: 'severity_trend_up',
        type: 'severity_trend',
        severity: 'warning',
        title: 'Severity Trend Increasing',
        description: `High/critical incidents increased by ${((secondHalfCritical / Math.max(firstHalfCritical, 1) - 1) * 100).toFixed(0)}% in the last 15 days`,
        count: secondHalfCritical,
        timestamp: now,
      });
    }

    // Alert 5: SLA breach spike
    const slaBreaches = actions.filter(a => a.sla_breached === true);
    if (slaBreaches.length >= 10) {
      detectedAlerts.push({
        id: 'sla_breach_high',
        type: 'sla_breach',
        severity: 'warning',
        title: 'High SLA Breach Count',
        description: `${slaBreaches.length} actions have breached their SLA`,
        count: slaBreaches.length,
        threshold: 10,
        timestamp: now,
      });
    }

    return detectedAlerts;
  }, [incidents, actions, inspections]);

  const criticalAlerts = alerts.filter(a => a.severity === 'critical');
  const warningAlerts = alerts.filter(a => a.severity === 'warning');
  const infoAlerts = alerts.filter(a => a.severity === 'info');

  return {
    alerts,
    criticalAlerts,
    warningAlerts,
    infoAlerts,
    hasAlerts: alerts.length > 0,
    hasCritical: criticalAlerts.length > 0,
  };
}
