import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight, Minus, GitCompare } from "lucide-react";
import { MonthlyComparisonData } from "@/hooks/use-executive-comparison";
import { cn } from "@/lib/utils";
import { format, subMonths } from "date-fns";

interface MonthComparisonTableProps {
  comparisonData: MonthlyComparisonData | null;
  selectedMonth: Date;
  isLoading?: boolean;
}

interface MetricRow {
  key: string;
  labelKey: string;
  currentValue: number | string;
  previousValue: number | string;
  change: { value: number; percentage: number; trend: 'up' | 'down' | 'stable' };
  invertTrend?: boolean; // For metrics where down is good (like incidents)
  suffix?: string;
}

const TrendIcon = ({ trend, inverted }: { trend: 'up' | 'down' | 'stable'; inverted?: boolean }) => {
  if (trend === 'stable') {
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  }
  
  const isGood = inverted ? trend === 'down' : trend === 'up';
  
  if (trend === 'up') {
    return <ArrowUpRight className={cn("h-4 w-4", isGood ? 'text-green-500' : 'text-destructive')} />;
  }
  
  return <ArrowDownRight className={cn("h-4 w-4", isGood ? 'text-green-500' : 'text-destructive')} />;
};

export function MonthComparisonTable({ comparisonData, selectedMonth, isLoading }: MonthComparisonTableProps) {
  const { t } = useTranslation();
  const previousMonth = subMonths(selectedMonth, 1);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitCompare className="h-5 w-5" />
            {t('executiveReport.ai.monthComparison')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-10 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!comparisonData) {
    return null;
  }

  const { currentMonth, previousMonth: prevData, changes } = comparisonData;

  const metrics: MetricRow[] = [
    {
      key: 'incidents',
      labelKey: 'executiveReport.totalIncidents',
      currentValue: currentMonth?.incidents?.total || 0,
      previousValue: prevData?.incidents?.total || 0,
      change: changes.incidents,
      invertTrend: true, // Less incidents is good
    },
    {
      key: 'observations',
      labelKey: 'executiveReport.observations',
      currentValue: currentMonth?.incidents?.observations_count || 0,
      previousValue: prevData?.incidents?.observations_count || 0,
      change: changes.observations,
      invertTrend: false, // More observations is good
    },
    {
      key: 'actionsCompleted',
      labelKey: 'executiveReport.actionsCompleted',
      currentValue: currentMonth?.actions?.completed || 0,
      previousValue: prevData?.actions?.completed || 0,
      change: changes.actionsCompleted,
      invertTrend: false,
    },
    {
      key: 'compliance',
      labelKey: 'executiveReport.complianceRate',
      currentValue: currentMonth?.inspections?.avg_compliance_percentage || 0,
      previousValue: prevData?.inspections?.avg_compliance_percentage || 0,
      change: changes.compliance,
      invertTrend: false,
      suffix: '%',
    },
    {
      key: 'closureTime',
      labelKey: 'executiveReport.avgClosureTime',
      currentValue: currentMonth?.incidents?.avg_closure_days || 0,
      previousValue: prevData?.incidents?.avg_closure_days || 0,
      change: changes.closureTime,
      invertTrend: true, // Less days is good
      suffix: ` ${t('common.days')}`,
    },
    {
      key: 'overdue',
      labelKey: 'executiveReport.overdue',
      currentValue: currentMonth?.actions?.overdue || 0,
      previousValue: prevData?.actions?.overdue || 0,
      change: changes.overdueRate,
      invertTrend: true, // Less overdue is good
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitCompare className="h-5 w-5" />
          {t('executiveReport.ai.monthComparison')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-start py-2 px-3 font-medium text-muted-foreground">
                  {t('executiveReport.ai.metric')}
                </th>
                <th className="text-center py-2 px-3 font-medium text-muted-foreground">
                  {format(previousMonth, 'MMM yyyy')}
                </th>
                <th className="text-center py-2 px-3 font-medium text-muted-foreground">
                  {format(selectedMonth, 'MMM yyyy')}
                </th>
                <th className="text-center py-2 px-3 font-medium text-muted-foreground">
                  {t('executiveReport.ai.change')}
                </th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((metric) => (
                <tr key={metric.key} className="border-b last:border-b-0">
                  <td className="py-3 px-3 font-medium">
                    {t(metric.labelKey)}
                  </td>
                  <td className="py-3 px-3 text-center text-muted-foreground">
                    {metric.previousValue}{metric.suffix || ''}
                  </td>
                  <td className="py-3 px-3 text-center font-semibold">
                    {metric.currentValue}{metric.suffix || ''}
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center justify-center gap-1">
                      <TrendIcon trend={metric.change.trend} inverted={metric.invertTrend} />
                      <span className={cn(
                        "text-sm font-medium",
                        metric.change.trend === 'stable' && 'text-muted-foreground',
                        metric.change.trend === 'up' && (metric.invertTrend ? 'text-destructive' : 'text-green-500'),
                        metric.change.trend === 'down' && (metric.invertTrend ? 'text-green-500' : 'text-destructive'),
                      )}>
                        {metric.change.percentage >= 0 ? '+' : ''}{metric.change.percentage}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
