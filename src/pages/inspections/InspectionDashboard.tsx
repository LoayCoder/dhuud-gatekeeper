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
import { EnterprisePage } from '@/components/layout/EnterprisePage';
import { SectionHeader } from '@/components/ui/section-header';
import { KPIStrip, type KPIItem } from '@/components/ui/kpi-strip';
import { ActionSummaryCard } from '@/components/ui/action-summary-card';
import { StatusBadge } from '@/components/ui/status-badge';
import i18n from '@/i18n';

function InspectionDashboardContent() {
  const { t } = useTranslation();
  const direction = i18n.dir();
  
  const { data: stats, isLoading: statsLoading } = useInspectionSessionStats();
  const { data: trend = [] } = useComplianceTrend();
  const { data: distribution } = useFindingsDistribution();
  const { data: overdueCount = 0 } = useOverdueInspectionsCount();
  const { data: recentFindings = [] } = useRecentFindings(5);

  const kpiItems: KPIItem[] = [
    {
      label: t('inspectionDashboard.stats.totalSessions'),
      value: stats?.total_sessions || 0,
      icon: ClipboardList,
      status: 'informational',
    },
    {
      label: t('inspectionDashboard.stats.inProgress'),
      value: stats?.in_progress || 0,
      icon: Clock,
      status: 'pending',
    },
    {
      label: t('inspectionDashboard.stats.avgCompliance'),
      value: stats?.avg_compliance ? `${stats.avg_compliance}%` : '-',
      icon: TrendingUp,
      status: 'completed',
    },
    {
      label: t('inspectionDashboard.stats.openFindings'),
      value: distribution?.total_open || 0,
      icon: AlertTriangle,
      status: 'critical',
    },
  ];

  const getClassificationStatus = (classification: string) => {
    switch (classification) {
      case 'critical_nc':
      case 'major_nc':
        return 'critical';
      case 'minor_nc':
        return 'pending';
      default:
        return 'neutral';
    }
  };

  return (
    <EnterprisePage
      title={t('inspectionDashboard.title')}
      description={t('inspectionDashboard.description')}
      primaryAction={{
        label: t('inspectionDashboard.viewAllSessions'),
        href: '/inspections/sessions',
        icon: ArrowRight,
      }}
    >
      {/* Summary Section - KPI Strip */}
      <section>
        {statsLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : (
          <KPIStrip items={kpiItems} />
        )}
      </section>

      {/* Overdue Inspections Alert */}
      {overdueCount > 0 && (
        <ActionSummaryCard
          title={t('inspectionDashboard.overdueAlert.title')}
          description={t('inspectionDashboard.overdueAlert.description', { count: overdueCount })}
          status="pending"
          icon={AlertTriangle}
          iconBgClass="bg-warning/10"
          iconColorClass="text-warning"
          actionLabel={t('inspectionDashboard.overdueAlert.viewAssets')}
          onAction={() => window.location.href = '/assets?filter=overdue'}
        />
      )}

      {/* My Inspections Widget + Upcoming Schedules */}
      <section className="space-y-3">
        <SectionHeader title={t('inspections.myWork', 'My Work')} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <MyInspectionsWidget />
          <UpcomingSchedulesCard />
        </div>
      </section>

      {/* Charts Row */}
      <section className="space-y-3">
        <SectionHeader title={t('inspectionDashboard.analytics', 'Analytics')} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card variant="flat">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t('inspectionDashboard.charts.complianceTrend')}</CardTitle>
              <CardDescription>{t('inspectionDashboard.charts.complianceTrendDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <ComplianceTrendChart data={trend} />
            </CardContent>
          </Card>

          <Card variant="flat">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t('inspectionDashboard.charts.findingsDistribution')}</CardTitle>
              <CardDescription>{t('inspectionDashboard.charts.findingsDistributionDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <FindingsDistributionChart data={distribution?.by_classification || []} />
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Recent Open Findings */}
      <section className="space-y-3">
        <SectionHeader title={t('inspectionDashboard.recentFindings.title')} />
        <Card variant="flat">
          <CardContent className="pt-4">
            {recentFindings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>{t('inspectionDashboard.recentFindings.noFindings')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentFindings.map((finding) => (
                  <div
                    key={finding.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <FileWarning className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-sm">{finding.reference_id}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {finding.description || t('inspectionDashboard.recentFindings.noDescription')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <StatusBadge 
                        status={getClassificationStatus(finding.classification) as any}
                        size="sm"
                      >
                        {t(`inspectionDashboard.classifications.${finding.classification}`)}
                      </StatusBadge>
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
      </section>
    </EnterprisePage>
  );
}

export default function InspectionDashboard() {
  return (
    <ModuleGate module="asset_management">
      <InspectionDashboardContent />
    </ModuleGate>
  );
}
