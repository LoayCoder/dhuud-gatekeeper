import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { 
  ClipboardList, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  TrendingUp,
  ArrowRight,
  FileWarning
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ModuleGate } from '@/components/ModuleGate';
import {
  useInspectionSessionStats,
  useComplianceTrend,
  useFindingsDistribution,
  useOverdueInspectionsCount,
  useRecentFindings,
} from '@/hooks/use-inspection-dashboard';
import { ComplianceTrendChart } from '@/components/inspections/stats/ComplianceTrendChart';
import { FindingsDistributionChart } from '@/components/inspections/stats/FindingsDistributionChart';
import { UpcomingSchedulesCard } from '@/components/inspections/schedules/UpcomingSchedulesCard';
import { MyInspectionsWidget } from '@/components/inspections/MyInspectionsWidget';
import i18n from '@/i18n';

function InspectionDashboardContent() {
  const { t } = useTranslation();
  const direction = i18n.dir();
  
  const { data: stats, isLoading: statsLoading } = useInspectionSessionStats();
  const { data: trend = [] } = useComplianceTrend();
  const { data: distribution } = useFindingsDistribution();
  const { data: overdueCount = 0 } = useOverdueInspectionsCount();
  const { data: recentFindings = [] } = useRecentFindings(5);

  const statCards = [
    {
      title: t('inspectionDashboard.stats.totalSessions'),
      value: stats?.total_sessions || 0,
      icon: ClipboardList,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: t('inspectionDashboard.stats.inProgress'),
      value: stats?.in_progress || 0,
      icon: Clock,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
    },
    {
      title: t('inspectionDashboard.stats.avgCompliance'),
      value: stats?.avg_compliance ? `${stats.avg_compliance}%` : '-',
      icon: TrendingUp,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: t('inspectionDashboard.stats.openFindings'),
      value: distribution?.total_open || 0,
      icon: AlertTriangle,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
    },
  ];

  const getClassificationBadgeColor = (classification: string) => {
    switch (classification) {
      case 'critical_nc': return 'destructive';
      case 'major_nc': return 'destructive';
      case 'minor_nc': return 'secondary';
      case 'observation': return 'outline';
      case 'ofi': return 'outline';
      default: return 'secondary';
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6" dir={direction}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('inspectionDashboard.title')}</h1>
          <p className="text-muted-foreground">{t('inspectionDashboard.description')}</p>
        </div>
        <Button asChild>
          <Link to="/inspections/sessions">
            {t('inspectionDashboard.viewAllSessions')}
            <ArrowRight className="h-4 w-4 ms-2 rtl:rotate-180" />
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <Card key={index}>
            <CardContent className="pt-6">
              {statsLoading ? (
                <Skeleton className="h-16 w-full" />
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-full ${stat.bgColor}`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Overdue Inspections Alert */}
      {overdueCount > 0 && (
        <Card className="border-amber-500 bg-amber-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-amber-500/10">
                <AlertTriangle className="h-6 w-6 text-amber-500" />
              </div>
              <div className="flex-1">
                <p className="font-medium">{t('inspectionDashboard.overdueAlert.title')}</p>
                <p className="text-sm text-muted-foreground">
                  {t('inspectionDashboard.overdueAlert.description', { count: overdueCount })}
                </p>
              </div>
              <Button variant="outline" asChild>
                <Link to="/assets?filter=overdue">{t('inspectionDashboard.overdueAlert.viewAssets')}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* My Inspections Widget + Upcoming Schedules */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MyInspectionsWidget />
        <UpcomingSchedulesCard />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('inspectionDashboard.charts.complianceTrend')}</CardTitle>
            <CardDescription>{t('inspectionDashboard.charts.complianceTrendDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <ComplianceTrendChart data={trend} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('inspectionDashboard.charts.findingsDistribution')}</CardTitle>
            <CardDescription>{t('inspectionDashboard.charts.findingsDistributionDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <FindingsDistributionChart data={distribution?.by_classification || []} />
          </CardContent>
        </Card>
      </div>

      {/* Recent Open Findings */}
      <Card>
        <CardHeader>
          <CardTitle>{t('inspectionDashboard.recentFindings.title')}</CardTitle>
          <CardDescription>{t('inspectionDashboard.recentFindings.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          {recentFindings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>{t('inspectionDashboard.recentFindings.noFindings')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentFindings.map((finding) => (
                <div
                  key={finding.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FileWarning className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{finding.reference_id}</p>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {finding.description || t('inspectionDashboard.recentFindings.noDescription')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getClassificationBadgeColor(finding.classification)}>
                      {t(`inspectionDashboard.classifications.${finding.classification}`)}
                    </Badge>
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/inspections/sessions/area/${(finding.session as any)?.id || ''}`}>
                        {t('common.view')}
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function InspectionDashboard() {
  return (
    <ModuleGate module="asset_management">
      <InspectionDashboardContent />
    </ModuleGate>
  );
}
