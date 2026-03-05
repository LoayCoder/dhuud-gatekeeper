import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { useIncidentMetricsBySeverity, useIncidentFrequencyTrend } from '@/features/incidents';
import { Flame, AlertTriangle } from 'lucide-react';

interface IncidentMetricsCardProps {
  startDate: string;
  endDate: string;
  branchId?: string;
  siteId?: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  level_1: 'hsl(142, 71%, 45%)',
  level_2: 'hsl(48, 96%, 53%)',
  level_3: 'hsl(25, 95%, 53%)',
  level_4: 'hsl(0, 84%, 60%)',
  level_5: 'hsl(0, 84%, 40%)',
  unassigned: 'hsl(217, 19%, 55%)',
};

export function IncidentMetricsCard({ startDate, endDate, branchId, siteId }: IncidentMetricsCardProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';
  const { data: severityData, isLoading: severityLoading } = useIncidentMetricsBySeverity(
    startDate, endDate, branchId, siteId
  );
  const { data: trendData, isLoading: trendLoading } = useIncidentFrequencyTrend(
    startDate, endDate, branchId, siteId
  );

  // Build horizontal bar chart data from 5-level severity
  const chartData = severityData ? [
    { name: t('severity.level5.label', 'Level 5 - Catastrophic'), value: severityData.level_5, key: 'level_5' },
    { name: t('severity.level4.label', 'Level 4 - Major'), value: severityData.level_4, key: 'level_4' },
    { name: t('severity.level3.label', 'Level 3 - Serious'), value: severityData.level_3, key: 'level_3' },
    { name: t('severity.level2.label', 'Level 2 - Moderate'), value: severityData.level_2, key: 'level_2' },
    { name: t('severity.level1.label', 'Level 1 - Low'), value: severityData.level_1, key: 'level_1' },
    { name: t('severity.unassigned', 'N/A'), value: severityData.unassigned, key: 'unassigned' },
  ].filter(item => item.value > 0) : [];

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  if (severityLoading || trendLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-[300px]" />
        <Skeleton className="h-[300px]" />
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Severity Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            {t('kpiDashboard.incidentsBySeverity', 'Incidents by Severity')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {total === 0 ? (
            <div className="flex h-[250px] items-center justify-center text-muted-foreground text-sm">
              {t('hsseDashboard.noData', 'No data available')}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ left: isRTL ? 10 : 120, right: isRTL ? 120 : 10 }}
              >
                <XAxis type="number" allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={110}
                  tick={{ fontSize: 11 }}
                  orientation={isRTL ? 'right' : 'left'}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [value, t('hsseDashboard.count', 'Count')]}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                  {chartData.map((entry) => (
                    <Cell key={entry.key} fill={SEVERITY_COLORS[entry.key] || SEVERITY_COLORS.unassigned} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Frequency Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Flame className="h-5 w-5 text-orange-500" />
            {t('kpiDashboard.frequencyTrend', 'Incident Frequency Trend')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {trendData && trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={trendData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2.5}
                  dot={{ fill: 'hsl(var(--background))', stroke: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[250px] items-center justify-center text-muted-foreground text-sm">
              {t('hsseDashboard.noData', 'No trending data available')}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

