import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useObservationTrends } from '@/hooks/use-observation-trends';
import { Building, MapPin } from 'lucide-react';

interface ObservationRatioBreakdownProps {
  startDate?: Date;
  endDate?: Date;
  branchId?: string;
  siteId?: string;
}

export function ObservationRatioBreakdown({ startDate, endDate, branchId, siteId }: ObservationRatioBreakdownProps) {
  const { t } = useTranslation();
  const { data, isLoading } = useObservationTrends({ startDate, endDate, branchId, siteId });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const departmentData = data?.by_department?.map(item => ({
    name: item.department_name,
    positive: item.positive,
    negative: item.negative,
    ratio: item.positive_ratio,
    total: item.total,
  })) || [];

  const siteData = data?.by_site?.map(item => ({
    name: item.site_name,
    positive: item.positive,
    negative: item.negative,
    ratio: item.positive_ratio,
    total: item.total,
  })) || [];

  const getRatioColor = (ratio: number | null) => {
    if (ratio === null) return 'hsl(var(--muted-foreground))';
    if (ratio >= 2) return 'hsl(var(--chart-3))';
    if (ratio >= 1) return 'hsl(var(--warning))';
    return 'hsl(var(--destructive))';
  };

  const renderBreakdownChart = (chartData: typeof departmentData) => (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={chartData.slice(0, 10)} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis type="number" tick={{ fontSize: 11 }} />
          <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'hsl(var(--popover))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
            }}
            formatter={(value: number, name: string) => [value, name === 'positive' ? t('observationTrends.positive') : t('observationTrends.negative')]}
          />
          <Bar dataKey="positive" stackId="a" fill="hsl(var(--chart-3))" radius={[0, 0, 0, 0]} />
          <Bar dataKey="negative" stackId="a" fill="hsl(var(--destructive))" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
      
      {/* Ratio list */}
      <div className="space-y-2 max-h-[200px] overflow-y-auto">
        {chartData.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
            <span className="text-sm truncate flex-1">{item.name}</span>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {item.total} {t('common.total')}
              </Badge>
              <Badge 
                style={{ backgroundColor: getRatioColor(item.ratio), color: 'white' }}
                className="text-xs"
              >
                {item.ratio !== null ? `${item.ratio}:1` : 'N/A'}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('observationTrends.breakdown', 'Observation Ratio Breakdown')}</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="department">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="department" className="gap-2">
              <Building className="h-4 w-4" />
              {t('observationTrends.byDepartment', 'By Department')}
            </TabsTrigger>
            <TabsTrigger value="site" className="gap-2">
              <MapPin className="h-4 w-4" />
              {t('observationTrends.bySite', 'By Site')}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="department" className="mt-4">
            {departmentData.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                {t('common.noData')}
              </div>
            ) : (
              renderBreakdownChart(departmentData)
            )}
          </TabsContent>
          <TabsContent value="site" className="mt-4">
            {siteData.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                {t('common.noData')}
              </div>
            ) : (
              renderBreakdownChart(siteData)
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
