import { useTranslation } from "react-i18next";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, X, Bell, TrendingUp, Clock, MapPin } from "lucide-react";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";

interface CriticalAlert {
  id: string;
  type: 'critical_spike' | 'overdue_actions' | 'hotspot' | 'severity_increase';
  title: string;
  description: string;
  severity: 'warning' | 'critical';
  timestamp: Date;
}

interface CriticalAlertBannerProps {
  summary?: {
    critical_count?: number;
    high_count?: number;
    total_count?: number;
  };
  actionStats?: {
    overdue?: number;
    total?: number;
    open?: number;
  };
}

export function CriticalAlertBanner({ summary, actionStats }: CriticalAlertBannerProps) {
  const { t } = useTranslation();
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  const alerts = useMemo(() => {
    const detectedAlerts: CriticalAlert[] = [];
    const now = new Date();

    // Check for critical incidents (high count of critical/high severity)
    const criticalCount = summary?.critical_count ?? 0;
    const highCount = summary?.high_count ?? 0;
    
    if (criticalCount >= 3) {
      detectedAlerts.push({
        id: 'critical_spike',
        type: 'critical_spike',
        title: t('alerts.criticalSpike', 'Critical Incident Spike'),
        description: t('alerts.criticalSpikeDesc', '{{count}} critical incidents detected. Immediate action required.', { count: criticalCount }),
        severity: 'critical',
        timestamp: now,
      });
    }

    // Check for high overdue rate (>25%)
    const overdueCount = actionStats?.overdue ?? 0;
    const totalActions = actionStats?.total ?? 0;
    const overdueRate = totalActions > 0 ? (overdueCount / totalActions) * 100 : 0;
    
    if (overdueRate > 25 && overdueCount >= 5) {
      detectedAlerts.push({
        id: 'overdue_actions',
        type: 'overdue_actions',
        title: t('alerts.overdueActions', 'High Overdue Rate'),
        description: t('alerts.overdueActionsDesc', '{{rate}}% of actions are overdue ({{count}} total). Review and prioritize.', { 
          rate: overdueRate.toFixed(0), 
          count: overdueCount 
        }),
        severity: 'warning',
        timestamp: now,
      });
    }

    return detectedAlerts.filter(a => !dismissedAlerts.has(a.id));
  }, [summary, actionStats, dismissedAlerts, t]);

  const dismissAlert = (id: string) => {
    setDismissedAlerts(prev => new Set([...prev, id]));
  };

  if (alerts.length === 0) {
    return null;
  }

  const getAlertIcon = (type: CriticalAlert['type']) => {
    switch (type) {
      case 'critical_spike': return AlertTriangle;
      case 'overdue_actions': return Clock;
      case 'hotspot': return MapPin;
      case 'severity_increase': return TrendingUp;
      default: return Bell;
    }
  };

  return (
    <div className="space-y-3">
      {alerts.map((alert) => {
        const Icon = getAlertIcon(alert.type);
        return (
          <Alert 
            key={alert.id} 
            variant={alert.severity === 'critical' ? 'destructive' : 'default'}
            className={cn(
              "animate-in slide-in-from-top-2",
              alert.severity === 'critical' && "border-destructive/50 bg-destructive/5"
            )}
          >
            <Icon className="h-4 w-4" />
            <AlertTitle className="flex items-center justify-between">
              <span>{alert.title}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 -me-2"
                onClick={() => dismissAlert(alert.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </AlertTitle>
            <AlertDescription>
              {alert.description}
            </AlertDescription>
          </Alert>
        );
      })}
    </div>
  );
}
