import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Eye, ClipboardList, Search } from "lucide-react";
import type { DashboardSummary, ActionStats } from "@/hooks/use-hsse-event-dashboard";

interface EnhancedKPIGridProps {
  summary: DashboardSummary;
  actions: ActionStats;
}

interface KPIGroupProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  total: number;
  open: number;
  closed: number;
  overdue?: number;
}

function KPIGroup({ title, icon: Icon, iconBg, total, open, closed, overdue }: KPIGroupProps) {
  const { t } = useTranslation();

  return (
    <Card className="bg-card">
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className={`p-2 rounded-lg ${iconBg}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{total}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border-blue-200 dark:border-blue-800">
            {t('hsseDashboard.openStatus', 'Open')}: {open}
          </Badge>
          <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400 border-green-200 dark:border-green-800">
            {t('hsseDashboard.closedStatus', 'Closed')}: {closed}
          </Badge>
          {overdue !== undefined && overdue > 0 && (
            <Badge variant="destructive">
              {t('hsseDashboard.overdueStatus', 'Overdue')}: {overdue}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function EnhancedKPIGrid({ summary, actions }: EnhancedKPIGridProps) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <KPIGroup
        title={t('hsseDashboard.totalIncidents', 'Incidents')}
        icon={AlertTriangle}
        iconBg="bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
        total={summary.total_incidents}
        open={summary.incidents_open || 0}
        closed={summary.incidents_closed || 0}
        overdue={summary.incidents_overdue || 0}
      />
      <KPIGroup
        title={t('hsseDashboard.totalObservations', 'Observations')}
        icon={Eye}
        iconBg="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
        total={summary.total_observations}
        open={summary.observations_open || 0}
        closed={summary.observations_closed || 0}
      />
      <KPIGroup
        title={t('hsseDashboard.totalActions', 'Corrective Actions')}
        icon={ClipboardList}
        iconBg="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
        total={actions.total_actions || 0}
        open={actions.open_actions}
        closed={actions.actions_closed || 0}
        overdue={actions.overdue_actions}
      />
      <KPIGroup
        title={t('hsseDashboard.totalInvestigationsCount', 'Investigations')}
        icon={Search}
        iconBg="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400"
        total={summary.total_investigations || 0}
        open={summary.investigations_open || 0}
        closed={summary.investigations_closed || 0}
      />
    </div>
  );
}
