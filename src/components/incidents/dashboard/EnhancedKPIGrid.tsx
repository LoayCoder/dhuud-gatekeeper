import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Eye, ClipboardList, Search } from "lucide-react";
import { useDashboardDrilldown } from "@/hooks/use-dashboard-drilldown";
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
  onTotalClick?: () => void;
  onOpenClick?: () => void;
  onClosedClick?: () => void;
  onOverdueClick?: () => void;
}

function KPIGroup({ 
  title, 
  icon: Icon, 
  iconBg, 
  total, 
  open, 
  closed, 
  overdue,
  onTotalClick,
  onOpenClick,
  onClosedClick,
  onOverdueClick,
}: KPIGroupProps) {
  const { t } = useTranslation();

  return (
    <Card className="bg-gradient-to-br from-card to-muted/30 border-border/50 hover:shadow-md transition-all">
      <CardContent className="p-4">
        <div 
          className={`flex items-center gap-3 mb-3 ${onTotalClick ? 'cursor-pointer hover:opacity-80' : ''}`}
          onClick={onTotalClick}
        >
          <div className={`p-2.5 rounded-xl ${iconBg} shadow-sm`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{total}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge 
            variant="outline" 
            className={`bg-info/10 text-info border-info/20 ${onOpenClick ? 'cursor-pointer hover:bg-info/20' : ''}`}
            onClick={onOpenClick}
          >
            {t('hsseDashboard.openStatus', 'Open')}: {open}
          </Badge>
          <Badge 
            variant="outline" 
            className={`bg-success/10 text-success border-success/20 ${onClosedClick ? 'cursor-pointer hover:bg-success/20' : ''}`}
            onClick={onClosedClick}
          >
            {t('hsseDashboard.closedStatus', 'Closed')}: {closed}
          </Badge>
          {overdue !== undefined && overdue > 0 && (
            <Badge 
              variant="destructive"
              className={onOverdueClick ? 'cursor-pointer hover:bg-destructive/90' : ''}
              onClick={onOverdueClick}
            >
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
  const { drillDown, drillDownToActions } = useDashboardDrilldown();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <KPIGroup
        title={t('hsseDashboard.totalIncidents', 'Incidents')}
        icon={AlertTriangle}
        iconBg="bg-warning/10 text-warning"
        total={summary.total_incidents}
        open={summary.incidents_open || 0}
        closed={summary.incidents_closed || 0}
        overdue={summary.incidents_overdue || 0}
        onTotalClick={() => drillDown({ eventType: 'incident' })}
        onOpenClick={() => drillDown({ eventType: 'incident', status: 'investigation_in_progress' })}
        onClosedClick={() => drillDown({ eventType: 'incident', status: 'closed' })}
        onOverdueClick={() => drillDownToActions('overdue')}
      />
      <KPIGroup
        title={t('hsseDashboard.totalObservations', 'Observations')}
        icon={Eye}
        iconBg="bg-info/10 text-info"
        total={summary.total_observations}
        open={summary.observations_open || 0}
        closed={summary.observations_closed || 0}
        onTotalClick={() => drillDown({ eventType: 'observation' })}
        onOpenClick={() => drillDown({ eventType: 'observation', status: 'investigation_in_progress' })}
        onClosedClick={() => drillDown({ eventType: 'observation', status: 'closed' })}
      />
      <KPIGroup
        title={t('hsseDashboard.totalActions', 'Corrective Actions')}
        icon={ClipboardList}
        iconBg="bg-primary/10 text-primary"
        total={actions.total_actions || 0}
        open={actions.open_actions}
        closed={actions.actions_closed || 0}
        overdue={actions.overdue_actions}
        onTotalClick={() => drillDownToActions()}
        onOpenClick={() => drillDownToActions('pending')}
        onOverdueClick={() => drillDownToActions('overdue')}
      />
      <KPIGroup
        title={t('hsseDashboard.totalInvestigationsCount', 'Investigations')}
        icon={Search}
        iconBg="bg-secondary text-secondary-foreground"
        total={summary.total_investigations || 0}
        open={summary.investigations_open || 0}
        closed={summary.investigations_closed || 0}
        onTotalClick={() => drillDown({ status: 'investigation_in_progress' })}
        onOpenClick={() => drillDown({ status: 'investigation_in_progress' })}
        onClosedClick={() => drillDown({ status: 'closed' })}
      />
    </div>
  );
}
