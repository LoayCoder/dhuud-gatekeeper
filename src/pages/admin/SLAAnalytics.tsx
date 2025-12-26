import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSLAAnalytics, SLAAnalyticsFilters } from '@/hooks/use-sla-analytics';
import { SLAComplianceChart } from '@/components/sla/SLAComplianceChart';
import { DepartmentPerformanceTable } from '@/components/sla/DepartmentPerformanceTable';
import { EscalationHeatmap } from '@/components/sla/EscalationHeatmap';
import { Skeleton } from '@/components/ui/skeleton';
import { format, subMonths } from 'date-fns';
import { 
  CalendarIcon, 
  TrendingUp, 
  Clock, 
  Target, 
  AlertTriangle,
  BarChart3,
  FileDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { exportToCSV } from '@/lib/export-utils';

export default function SLAAnalytics() {
  const { t } = useTranslation();
  const [filters, setFilters] = useState<SLAAnalyticsFilters>({
    startDate: subMonths(new Date(), 12),
    endDate: new Date(),
  });

  const { analytics, isLoading } = useSLAAnalytics(filters);

  const handleExport = () => {
    const exportData = analytics.departmentPerformance.map(dept => ({
      department: dept.departmentName,
      total_actions: dept.totalActions,
      completed_on_time: dept.completedOnTime,
      breached: dept.breached,
      compliance_rate: `${dept.complianceRate}%`,
      avg_resolution_days: dept.avgResolutionDays,
    }));

    exportToCSV(exportData, 'sla-analytics-export', [
      { key: 'department', label: t('common.department', 'Department') },
      { key: 'total_actions', label: t('sla.totalActions', 'Total Actions') },
      { key: 'completed_on_time', label: t('sla.onTime', 'On Time') },
      { key: 'breached', label: t('sla.breached', 'Breached') },
      { key: 'compliance_rate', label: t('sla.complianceRate', 'Compliance Rate') },
      { key: 'avg_resolution_days', label: t('sla.avgResolution', 'Avg Resolution Days') },
    ]);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('sla.analytics', 'SLA Analytics')}</h1>
          <p className="text-muted-foreground">
            {t('sla.analyticsDescription', 'Historical trends, performance metrics, and compliance reports')}
          </p>
        </div>
        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("justify-start text-start font-normal")}>
                <CalendarIcon className="me-2 h-4 w-4" />
                {filters.startDate ? format(filters.startDate, 'PP') : t('common.startDate', 'Start Date')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.startDate}
                onSelect={(date) => setFilters(prev => ({ ...prev, startDate: date }))}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("justify-start text-start font-normal")}>
                <CalendarIcon className="me-2 h-4 w-4" />
                {filters.endDate ? format(filters.endDate, 'PP') : t('common.endDate', 'End Date')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.endDate}
                onSelect={(date) => setFilters(prev => ({ ...prev, endDate: date }))}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <Select 
            value={filters.priority || 'all'} 
            onValueChange={(v) => setFilters(prev => ({ ...prev, priority: v === 'all' ? undefined : v }))}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={t('common.priority', 'Priority')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all', 'All')}</SelectItem>
              <SelectItem value="critical">{t('priorities.critical', 'Critical')}</SelectItem>
              <SelectItem value="high">{t('priorities.high', 'High')}</SelectItem>
              <SelectItem value="medium">{t('priorities.medium', 'Medium')}</SelectItem>
              <SelectItem value="low">{t('priorities.low', 'Low')}</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExport}>
            <FileDown className="me-2 h-4 w-4" />
            {t('common.export', 'Export')}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('sla.totalActions', 'Total Actions')}</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{analytics.totalActions}</div>
                <p className="text-xs text-muted-foreground">
                  {analytics.activeActions} {t('sla.active', 'active')}
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('sla.complianceRate', 'Compliance Rate')}</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className={cn(
                  "text-2xl font-bold",
                  analytics.overallComplianceRate >= 90 ? "text-green-600" : 
                  analytics.overallComplianceRate >= 70 ? "text-yellow-600" : "text-red-600"
                )}>
                  {analytics.overallComplianceRate}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('sla.onTimeCompletion', 'on-time completion')}
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('sla.avgResolution', 'Avg Resolution')}</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{analytics.avgResolutionTime} {t('common.days', 'days')}</div>
                <p className="text-xs text-muted-foreground">
                  {t('sla.fromCreationToClose', 'from creation to close')}
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('sla.escalationRate', 'Escalation Rate')}</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className={cn(
                  "text-2xl font-bold",
                  analytics.escalationMetrics.escalationRate <= 10 ? "text-green-600" : 
                  analytics.escalationMetrics.escalationRate <= 25 ? "text-yellow-600" : "text-red-600"
                )}>
                  {analytics.escalationMetrics.escalationRate}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {analytics.escalationMetrics.level1 + analytics.escalationMetrics.level2} {t('sla.escalatedActions', 'escalated actions')}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      {isLoading ? (
        <div className="grid gap-4">
          <Skeleton className="h-[350px] w-full" />
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-[300px] w-full" />
            <Skeleton className="h-[300px] w-full" />
          </div>
        </div>
      ) : (
        <>
          {/* Compliance Trend Chart */}
          <SLAComplianceChart data={analytics.monthlyTrends} />

          {/* Escalation and Priority Charts */}
          <EscalationHeatmap 
            escalationMetrics={analytics.escalationMetrics} 
            priorityMetrics={analytics.priorityMetrics} 
          />

          {/* Department Performance Table */}
          <DepartmentPerformanceTable data={analytics.departmentPerformance} />
        </>
      )}
    </div>
  );
}
