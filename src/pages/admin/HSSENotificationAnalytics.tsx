import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  BarChart3, TrendingUp, Clock, AlertTriangle, CheckCircle2, 
  Users, Building2, PieChart, Download, RefreshCw 
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AdminRoute } from '@/components/AdminRoute';
import { 
  useHSSEComplianceMetrics, 
  useHSSEAcknowledgmentRates,
  useHSSEResponseTimeDistribution,
  useHSSECategoryDistribution,
} from '@/hooks/use-hsse-analytics';
import { cn } from '@/lib/utils';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPieChart, Pie, Cell, Legend,
  LineChart, Line, AreaChart, Area
} from 'recharts';

const PRIORITY_COLORS = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
};

const CATEGORY_COLORS = [
  '#3b82f6', '#8b5cf6', '#ef4444', '#22c55e', '#f97316', '#6b7280'
];

function MetricCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, 
  trendDirection,
  variant = 'default',
  isLoading,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: number;
  trendDirection?: 'up' | 'down' | 'neutral';
  variant?: 'default' | 'success' | 'warning' | 'danger';
  isLoading?: boolean;
}) {
  const variantStyles = {
    default: 'bg-card',
    success: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800',
    warning: 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800',
    danger: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800',
  };

  const iconStyles = {
    default: 'text-muted-foreground',
    success: 'text-green-600',
    warning: 'text-yellow-600',
    danger: 'text-red-600',
  };

  if (isLoading) {
    return (
      <Card className={cn(variantStyles[variant])}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2 text-end">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(variantStyles[variant])}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className={cn("p-3 rounded-full bg-muted", iconStyles[variant])}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="text-end">
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-sm text-muted-foreground">{title}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>
        {trend !== undefined && (
          <div className={cn(
            "mt-4 flex items-center justify-end gap-1 text-sm",
            trendDirection === 'up' ? 'text-green-600' : trendDirection === 'down' ? 'text-red-600' : 'text-muted-foreground'
          )}>
            <TrendingUp className={cn("h-4 w-4", trendDirection === 'down' && 'rotate-180')} />
            <span>{trend}% vs last period</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ComplianceByBranchTable({ data, isLoading }: { data: any[]; isLoading: boolean }) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    );
  }

  if (!data?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Building2 className="h-12 w-12 mb-4 opacity-50" />
        <p>{t('hsseNotifications.analytics.noData')}</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-start">{t('hsseNotifications.analytics.branch')}</TableHead>
          <TableHead className="text-start">{t('hsseNotifications.analytics.notifications')}</TableHead>
          <TableHead className="text-start">{t('hsseNotifications.analytics.acknowledged')}</TableHead>
          <TableHead className="text-start">{t('hsseNotifications.analytics.rate')}</TableHead>
          <TableHead className="text-start">{t('hsseNotifications.analytics.avgResponse')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((branch) => {
          const rateColor = branch.acknowledgment_rate >= 90 
            ? 'text-green-600' 
            : branch.acknowledgment_rate >= 70 
              ? 'text-yellow-600' 
              : 'text-red-600';
          
          return (
            <TableRow key={branch.branch_id}>
              <TableCell className="font-medium">{branch.branch_name}</TableCell>
              <TableCell>{branch.total_notifications}</TableCell>
              <TableCell>
                {branch.total_actual_acks}/{branch.total_expected_acks}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Progress 
                    value={branch.acknowledgment_rate} 
                    className="h-2 w-20" 
                  />
                  <span className={cn("text-sm font-medium", rateColor)}>
                    {branch.acknowledgment_rate}%
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {branch.avg_response_hours ? `${branch.avg_response_hours}h` : '-'}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

export default function HSSENotificationAnalytics() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  
  const { data: metrics, isLoading: metricsLoading, refetch: refetchMetrics } = useHSSEComplianceMetrics();
  const { data: branchRates, isLoading: branchLoading } = useHSSEAcknowledgmentRates();
  const { data: responseTime, isLoading: responseLoading } = useHSSEResponseTimeDistribution();
  const { data: categoryDist, isLoading: categoryLoading } = useHSSECategoryDistribution();

  const handleExport = () => {
    // TODO: Implement Excel export
    console.log('Export clicked');
  };

  // Prepare chart data
  const weeklyTrendData = metrics?.weekly_trend?.map((week: any) => ({
    week: new Date(week.week_start).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' }),
    sent: week.total_sent,
    rate: week.ack_rate,
  })) || [];

  const responseTimeData = responseTime?.map(item => ({
    priority: t(`hsseNotifications.priority.${item.priority}`),
    avgHours: item.avg_hours || 0,
    fill: PRIORITY_COLORS[item.priority as keyof typeof PRIORITY_COLORS] || '#6b7280',
  })) || [];

  const categoryData = categoryDist?.map((item, index) => ({
    name: t(`hsseNotifications.category.${item.category}`),
    value: item.count,
    fill: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
  })) || [];

  return (
    <AdminRoute>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="h-6 w-6" />
              {t('hsseNotifications.analytics.title')}
            </h1>
            <p className="text-muted-foreground">
              {t('hsseNotifications.analytics.subtitle')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetchMetrics()}>
              <RefreshCw className="h-4 w-4 me-2" />
              {t('common.refresh')}
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 me-2" />
              {t('common.export')}
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title={t('hsseNotifications.analytics.totalMandatory')}
            value={metrics?.total_mandatory_notifications ?? 0}
            subtitle={t('hsseNotifications.analytics.last30Days')}
            icon={AlertTriangle}
            isLoading={metricsLoading}
          />
          <MetricCard
            title={t('hsseNotifications.analytics.overallAckRate')}
            value={`${metrics?.overall_ack_rate ?? 0}%`}
            icon={CheckCircle2}
            variant={
              (metrics?.overall_ack_rate ?? 0) >= 90 ? 'success' : 
              (metrics?.overall_ack_rate ?? 0) >= 70 ? 'warning' : 'danger'
            }
            isLoading={metricsLoading}
          />
          <MetricCard
            title={t('hsseNotifications.analytics.avgResponseTime')}
            value={`${metrics?.avg_response_time_hours ?? 0}h`}
            icon={Clock}
            isLoading={metricsLoading}
          />
          <MetricCard
            title={t('hsseNotifications.analytics.overdue')}
            value={metrics?.overdue_count ?? 0}
            subtitle={`${metrics?.critical_pending ?? 0} ${t('hsseNotifications.priority.critical')}`}
            icon={AlertTriangle}
            variant={(metrics?.overdue_count ?? 0) > 0 ? 'danger' : 'default'}
            isLoading={metricsLoading}
          />
        </div>

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Weekly Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                {t('hsseNotifications.analytics.weeklyTrend')}
              </CardTitle>
              <CardDescription>
                {t('hsseNotifications.analytics.weeklyTrendDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {metricsLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : weeklyTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={weeklyTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" reversed={isRTL} />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Area 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="sent" 
                      stroke="#3b82f6" 
                      fill="#3b82f6" 
                      fillOpacity={0.3}
                      name={t('hsseNotifications.analytics.sent')}
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="rate" 
                      stroke="#22c55e" 
                      strokeWidth={2}
                      name={t('hsseNotifications.analytics.ackRate')}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  {t('hsseNotifications.analytics.noData')}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Response Time by Priority */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                {t('hsseNotifications.analytics.responseByPriority')}
              </CardTitle>
              <CardDescription>
                {t('hsseNotifications.analytics.responseByPriorityDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {responseLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : responseTimeData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={responseTimeData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" unit="h" />
                    <YAxis dataKey="priority" type="category" width={100} />
                    <Tooltip formatter={(value: number) => [`${value}h`, t('hsseNotifications.analytics.avgResponse')]} />
                    <Bar dataKey="avgHours" radius={[0, 4, 4, 0]}>
                      {responseTimeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  {t('hsseNotifications.analytics.noData')}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Category Distribution & Branch Compliance */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Category Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                {t('hsseNotifications.analytics.byCategory')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {categoryLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      labelLine={false}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  {t('hsseNotifications.analytics.noData')}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Branch Compliance Table */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {t('hsseNotifications.analytics.complianceByBranch')}
              </CardTitle>
              <CardDescription>
                {t('hsseNotifications.analytics.complianceByBranchDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ComplianceByBranchTable 
                data={branchRates || []} 
                isLoading={branchLoading} 
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminRoute>
  );
}
