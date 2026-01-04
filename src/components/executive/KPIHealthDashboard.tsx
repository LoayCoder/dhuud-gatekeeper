import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, AlertCircle, CheckCircle2, AlertTriangle } from "lucide-react";
import { KPIHealth } from "@/hooks/use-executive-ai-insights";
import { cn } from "@/lib/utils";

interface KPIHealthDashboardProps {
  kpiHealth: KPIHealth[];
  isLoading?: boolean;
}

const statusConfig = {
  green: { 
    icon: CheckCircle2, 
    color: 'text-green-500', 
    bg: 'bg-green-500/10',
    label: 'On Target'
  },
  yellow: { 
    icon: AlertTriangle, 
    color: 'text-yellow-500', 
    bg: 'bg-yellow-500/10',
    label: 'At Risk'
  },
  red: { 
    icon: AlertCircle, 
    color: 'text-destructive', 
    bg: 'bg-destructive/10',
    label: 'Critical'
  },
};

export function KPIHealthDashboard({ kpiHealth, isLoading }: KPIHealthDashboardProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            {t('executiveReport.ai.kpiHealth')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse grid grid-cols-2 md:grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-20 bg-muted rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!kpiHealth || kpiHealth.length === 0) {
    return null;
  }

  // Sort by status: red first, then yellow, then green
  const sortedKPIs = [...kpiHealth].sort((a, b) => {
    const order = { red: 0, yellow: 1, green: 2 };
    return order[a.status] - order[b.status];
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          {t('executiveReport.ai.kpiHealth')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sortedKPIs.map((kpi, index) => {
            const config = statusConfig[kpi.status];
            const StatusIcon = config.icon;
            
            return (
              <div 
                key={index}
                className={cn(
                  "p-3 rounded-lg border flex items-start gap-3",
                  config.bg
                )}
              >
                <StatusIcon className={cn("h-5 w-5 mt-0.5 shrink-0", config.color)} />
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm truncate">{kpi.kpi_name}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-lg font-bold">{kpi.current_value}</span>
                    <span className="text-xs text-muted-foreground">
                      / {kpi.target_value}
                    </span>
                  </div>
                  {kpi.gap > 0 && (
                    <div className={cn("text-xs mt-0.5", config.color)}>
                      {t('executiveReport.ai.gapOfTarget', { gap: kpi.gap.toFixed(1) })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
