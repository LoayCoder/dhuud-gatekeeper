import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, HardHat, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PeopleMetricsCardProps {
  data: {
    total_manhours: number;
    employee_hours: number;
    contractor_hours: number;
    employee_incidents: number;
    contractor_incidents: number;
    contractor_ratio: number;
    employee_pct: number;
    contractor_pct: number;
  } | null;
  isLoading: boolean;
}

export function PeopleMetricsCard({ data, isLoading }: PeopleMetricsCardProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t('kpiDashboard.peopleMetrics', 'People Metrics')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          {t('kpiDashboard.peopleMetrics', 'People Metrics')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Total Manhours */}
        <div className="mb-6 text-center">
          <p className="text-sm text-muted-foreground">
            {t('kpiDashboard.totalManhours', 'Total Man-Hours')}
          </p>
          <p className="text-4xl font-bold text-foreground">{formatNumber(data.total_manhours)}</p>
        </div>

        {/* Breakdown bar */}
        <div className="mb-4">
          <div className="flex h-4 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="bg-primary transition-all"
              style={{ width: `${data.employee_pct}%` }}
            />
            <div
              className="bg-warning transition-all"
              style={{ width: `${data.contractor_pct}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between text-xs">
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-primary" />
              <span className="text-muted-foreground">
                {t('kpiDashboard.employees', 'Employees')}: {data.employee_pct.toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-warning" />
              <span className="text-muted-foreground">
                {t('kpiDashboard.contractors', 'Contractors')}: {data.contractor_pct.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Detailed breakdown */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-primary/10 p-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">
                {t('kpiDashboard.employees', 'Employees')}
              </span>
            </div>
            <p className="mt-1 text-xl font-bold">{formatNumber(data.employee_hours)}</p>
            <p className="text-xs text-muted-foreground">
              {data.employee_incidents} {t('kpiDashboard.incidents', 'incidents')}
            </p>
          </div>

          <div className="rounded-lg bg-warning/10 p-3">
            <div className="flex items-center gap-2">
              <HardHat className="h-4 w-4 text-warning" />
              <span className="text-sm font-medium">
                {t('kpiDashboard.contractors', 'Contractors')}
              </span>
            </div>
            <p className="mt-1 text-xl font-bold">{formatNumber(data.contractor_hours)}</p>
            <p className="text-xs text-muted-foreground">
              {data.contractor_incidents} {t('kpiDashboard.incidents', 'incidents')}
            </p>
          </div>
        </div>

        {/* Contractor ratio */}
        {data.contractor_ratio > 0 && (
          <div className="mt-4 rounded-lg border p-3 text-center">
            <p className="text-sm text-muted-foreground">
              {t('kpiDashboard.contractorIncidentRatio', 'Contractor/Employee Incident Ratio')}
            </p>
            <p
              className={cn(
                'text-2xl font-bold',
                data.contractor_ratio > 1.5
                  ? 'text-destructive'
                  : data.contractor_ratio > 1
                    ? 'text-amber-500'
                    : 'text-emerald-500'
              )}
            >
              {data.contractor_ratio.toFixed(2)}:1
            </p>
            <p className="text-xs text-muted-foreground">
              {data.contractor_ratio > 1
                ? t('kpiDashboard.contractorsHigherRisk', 'Contractors at higher relative risk')
                : t('kpiDashboard.employeesHigherRisk', 'Employees at higher relative risk')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
