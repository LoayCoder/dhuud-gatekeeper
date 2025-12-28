import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  BarChart3, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Clock,
  Filter,
  Download,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSites } from '@/hooks/use-sites';
import {
  useInspectionAnalytics,
  useSessionTrend,
  useFindingsTrend,
  useTopFailingItems,
  AnalyticsPeriod,
  AnalyticsFilters,
} from '@/hooks/use-inspection-analytics';
import { CompletionRateChart } from '@/components/analytics/CompletionRateChart';
import { SLAComplianceChart } from '@/components/analytics/SLAComplianceChart';
import { FindingsTrendChart } from '@/components/analytics/FindingsTrendChart';
import { TopIssuesChart } from '@/components/analytics/TopIssuesChart';

export default function InspectionAnalytics() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  
  const [filters, setFilters] = useState<AnalyticsFilters>({
    period: 'month',
  });

  const { data: sites } = useSites();
  const { data: analytics, isLoading: isLoadingAnalytics } = useInspectionAnalytics(filters);
  const { data: sessionTrend } = useSessionTrend(filters);
  const { data: findingsTrend } = useFindingsTrend(filters);
  const { data: topFailingItems } = useTopFailingItems(filters);

  const handlePeriodChange = (period: AnalyticsPeriod) => {
    setFilters(prev => ({ ...prev, period }));
  };

  const handleSiteChange = (siteId: string) => {
    setFilters(prev => ({ 
      ...prev, 
      siteId: siteId === 'all' ? undefined : siteId 
    }));
  };

  const stats = [
    {
      title: t('analytics.totalSessions', 'Total Sessions'),
      value: analytics?.sessions?.total || 0,
      icon: BarChart3,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: t('analytics.completionRate', 'Completion Rate'),
      value: `${analytics?.completion_rate || 0}%`,
      icon: CheckCircle2,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      title: t('analytics.totalFindings', 'Total Findings'),
      value: analytics?.findings?.total || 0,
      icon: AlertTriangle,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
    {
      title: t('analytics.slaCompliance', 'SLA Compliance'),
      value: analytics?.sla_compliance?.total_with_due 
        ? `${Math.round((analytics.sla_compliance.on_time / analytics.sla_compliance.total_with_due) * 100)}%`
        : 'N/A',
      icon: Clock,
      color: 'text-info',
      bgColor: 'bg-info/10',
    },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            {t('analytics.inspectionAnalytics', 'Inspection Analytics')}
          </h1>
          <p className="text-muted-foreground">
            {t('analytics.description', 'Track inspection performance and trends')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filters.period} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={t('analytics.period', 'Period')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">{t('analytics.thisWeek', 'This Week')}</SelectItem>
              <SelectItem value="month">{t('analytics.thisMonth', 'This Month')}</SelectItem>
              <SelectItem value="quarter">{t('analytics.thisQuarter', 'This Quarter')}</SelectItem>
            </SelectContent>
          </Select>
          <Select 
            value={filters.siteId || 'all'} 
            onValueChange={handleSiteChange}
          >
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 me-2" />
              <SelectValue placeholder={t('analytics.allSites', 'All Sites')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('analytics.allSites', 'All Sites')}</SelectItem>
              {sites?.map((site) => (
                <SelectItem key={site.id} value={site.id}>
                  {site.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">
            <TrendingUp className="h-4 w-4 me-2" />
            {t('analytics.overview', 'Overview')}
          </TabsTrigger>
          <TabsTrigger value="findings">
            <AlertTriangle className="h-4 w-4 me-2" />
            {t('analytics.findings', 'Findings')}
          </TabsTrigger>
          <TabsTrigger value="issues">
            <BarChart3 className="h-4 w-4 me-2" />
            {t('analytics.topIssues', 'Top Issues')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('analytics.completionTrend', 'Completion Trend')}</CardTitle>
                <CardDescription>
                  {t('analytics.completionTrendDesc', 'Session completion rate over time')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CompletionRateChart data={sessionTrend || []} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{t('analytics.slaCompliance', 'SLA Compliance')}</CardTitle>
                <CardDescription>
                  {t('analytics.slaComplianceDesc', 'Finding resolution within SLA')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SLAComplianceChart data={analytics?.sla_compliance} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="findings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('analytics.findingsTrend', 'Findings Trend')}</CardTitle>
              <CardDescription>
                {t('analytics.findingsTrendDesc', 'Findings by classification over time')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FindingsTrendChart data={findingsTrend || []} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="issues" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('analytics.topFailingItems', 'Top Failing Items')}</CardTitle>
              <CardDescription>
                {t('analytics.topFailingItemsDesc', 'Most common inspection failures')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TopIssuesChart data={topFailingItems || []} isArabic={isArabic} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
