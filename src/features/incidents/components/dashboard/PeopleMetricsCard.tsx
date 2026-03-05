import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, ShieldAlert, Activity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import type { PeopleMetrics } from '@/hooks/use-kpi-indicators';

interface PeopleMetricsCardProps {
  data: PeopleMetrics | null;
  isLoading: boolean;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--warning))', 'hsl(var(--accent))', 'hsl(var(--muted-foreground))'];

export function PeopleMetricsCard({ data, isLoading }: PeopleMetricsCardProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';

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

  if (!data || data.total_injured === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            {t('kpiDashboard.peopleMetrics', 'People Metrics')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <ShieldAlert className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm">{t('kpiDashboard.noInjuries', 'No injuries recorded in this period')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Pie chart data
  const pieData = [
    { name: isRTL ? 'موظفين' : 'Employees', value: data.employee_count },
    { name: isRTL ? 'مقاولين' : 'Contractors', value: data.contractor_count },
    ...(data.visitor_count > 0 ? [{ name: isRTL ? 'زوار' : 'Visitors', value: data.visitor_count }] : []),
    ...(data.public_count > 0 ? [{ name: isRTL ? 'جمهور' : 'Public', value: data.public_count }] : []),
  ].filter(d => d.value > 0);

  // Body parts bar chart data
  const bodyPartsData = (data.top_body_parts || []).map(bp => ({
    name: bp.body_part.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    count: bp.count,
  }));

  // Classification badges
  const classifications = data.by_classification || {};
  const classificationOrder = ['FAT', 'LTI', 'RWC', 'MTC', 'FAC', 'NM'];
  const classificationColors: Record<string, string> = {
    FAT: 'bg-destructive text-destructive-foreground',
    LTI: 'bg-destructive/80 text-destructive-foreground',
    RWC: 'bg-warning text-warning-foreground',
    MTC: 'bg-warning/70 text-warning-foreground',
    FAC: 'bg-primary/70 text-primary-foreground',
    NM: 'bg-muted text-muted-foreground',
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          {t('kpiDashboard.peopleMetrics', 'People Metrics')}
          <Badge variant="outline" className="ms-auto font-mono">
            {data.total_injured} {t('kpiDashboard.totalInjured', 'injured')}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Classification Badges (Safety Pyramid) */}
        <div>
          <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
            <Activity className="h-3 w-3" />
            {t('kpiDashboard.injuryClassification', 'Injury Classification')}
          </p>
          <div className="flex flex-wrap gap-2">
            {classificationOrder.map(cls => {
              const count = classifications[cls] || 0;
              if (count === 0) return null;
              return (
                <Badge key={cls} className={classificationColors[cls] || ''}>
                  {cls}: {count}
                </Badge>
              );
            })}
            {classificationOrder.every(cls => !classifications[cls]) && (
              <span className="text-xs text-muted-foreground">{t('kpiDashboard.noClassification', 'No classification data')}</span>
            )}
          </div>
        </div>

        {/* Pie Chart - Person Type Split */}
        {pieData.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">
              {t('kpiDashboard.injurySplit', 'Injury Split by Person Type')}
            </p>
            <div className="flex items-center gap-4">
              <div className="w-28 h-28">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={25}
                      outerRadius={50}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((_, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col gap-1.5 text-sm">
                {pieData.map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-muted-foreground">{entry.name}:</span>
                    <span className="font-medium">{entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Bar Chart - Top Body Parts */}
        {bodyPartsData.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">
              {t('kpiDashboard.topBodyParts', 'Top Injured Body Parts')}
            </p>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bodyPartsData} layout="vertical" margin={{ left: 0, right: 8 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
