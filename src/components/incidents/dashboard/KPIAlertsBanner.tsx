import { useTranslation } from 'react-i18next';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, AlertCircle, TrendingUp, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface KPIAlert {
  code: string;
  label: string;
  value: number;
  threshold: number;
  severity: 'warning' | 'critical';
}

interface KPIAlertsBannerProps {
  alerts: KPIAlert[];
}

export function KPIAlertsBanner({ alerts }: KPIAlertsBannerProps) {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState<string[]>([]);

  const visibleAlerts = alerts.filter((a) => !dismissed.includes(a.code));

  if (visibleAlerts.length === 0) return null;

  const criticalAlerts = visibleAlerts.filter((a) => a.severity === 'critical');
  const warningAlerts = visibleAlerts.filter((a) => a.severity === 'warning');

  return (
    <div className="space-y-2">
      {criticalAlerts.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="flex items-center justify-between">
            <span>{t('kpiDashboard.criticalAlerts', 'Critical KPI Alerts')}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() =>
                setDismissed((prev) => [...prev, ...criticalAlerts.map((a) => a.code)])
              }
            >
              <X className="h-4 w-4" />
            </Button>
          </AlertTitle>
          <AlertDescription>
            <ul className="mt-2 list-inside list-disc space-y-1">
              {criticalAlerts.map((alert) => (
                <li key={alert.code}>
                  <span className="font-medium">{alert.label}:</span> {alert.value.toFixed(2)}{' '}
                  <span className="text-muted-foreground">
                    ({t('kpiDashboard.threshold', 'threshold')}: {alert.threshold})
                  </span>
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {warningAlerts.length > 0 && (
        <Alert className="border-amber-500/50 bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <AlertTitle className="flex items-center justify-between text-amber-700 dark:text-amber-400">
            <span>{t('kpiDashboard.warningAlerts', 'KPI Warnings')}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() =>
                setDismissed((prev) => [...prev, ...warningAlerts.map((a) => a.code)])
              }
            >
              <X className="h-4 w-4" />
            </Button>
          </AlertTitle>
          <AlertDescription className="text-amber-700 dark:text-amber-400">
            <ul className="mt-2 list-inside list-disc space-y-1">
              {warningAlerts.map((alert) => (
                <li key={alert.code}>
                  <span className="font-medium">{alert.label}:</span> {alert.value.toFixed(2)}{' '}
                  <span className="opacity-70">
                    ({t('kpiDashboard.threshold', 'threshold')}: {alert.threshold})
                  </span>
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
