import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, MapPin, Users, AlertTriangle, Eye, ClipboardList, Search } from "lucide-react";
import { TrendBadge } from "./TrendBadge";
import type { EventsByLocationData, BranchEventData, SiteEventData, DepartmentEventData } from "@/hooks/use-events-by-location";

interface Props {
  data: EventsByLocationData;
}

function MetricCell({ label, value, variant }: { label: string; value: number; variant?: 'danger' | 'success' | 'default' }) {
  return (
    <div className="text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-sm font-semibold ${
        variant === 'danger' ? 'text-destructive' : 
        variant === 'success' ? 'text-green-600 dark:text-green-400' : ''
      }`}>
        {value}
      </p>
    </div>
  );
}

function BranchCard({ branch }: { branch: BranchEventData }) {
  const { t } = useTranslation();
  const hasOverdue = (branch.actions_overdue || 0) > 0;

  return (
    <div className="p-4 bg-muted/50 rounded-lg space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{branch.branch_name}</span>
        </div>
        <TrendBadge current={branch.total_events} previous={branch.prev_total_events || 0} />
      </div>
      
      <div className="grid grid-cols-4 gap-2 border-t pt-3">
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <AlertTriangle className="h-3 w-3" />
            {t('hsseDashboard.incidents', 'Incidents')}
          </div>
          <p className="text-lg font-semibold">{branch.incidents}</p>
          <div className="flex gap-1 text-xs">
            <Badge variant="outline" className="text-[10px] px-1 py-0">{branch.incidents_open || 0} {t('hsseDashboard.open', 'open')}</Badge>
          </div>
        </div>
        
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Eye className="h-3 w-3" />
            {t('hsseDashboard.observations', 'Obs.')}
          </div>
          <p className="text-lg font-semibold">{branch.observations}</p>
          <div className="flex gap-1 text-xs">
            <Badge variant="outline" className="text-[10px] px-1 py-0">{branch.observations_open || 0} {t('hsseDashboard.open', 'open')}</Badge>
          </div>
        </div>
        
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <ClipboardList className="h-3 w-3" />
            {t('hsseDashboard.actions', 'Actions')}
          </div>
          <p className="text-lg font-semibold">{branch.total_actions || 0}</p>
          <div className="flex gap-1 text-xs">
            <Badge variant="outline" className="text-[10px] px-1 py-0">{branch.actions_open || 0} {t('hsseDashboard.open', 'open')}</Badge>
            {hasOverdue && (
              <Badge variant="destructive" className="text-[10px] px-1 py-0">{branch.actions_overdue} ⚠</Badge>
            )}
          </div>
        </div>
        
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Search className="h-3 w-3" />
            {t('hsseDashboard.investigations', 'Invest.')}
          </div>
          <p className="text-lg font-semibold">{branch.open_investigations}</p>
          <div className="flex gap-1 text-xs">
            <Badge variant="outline" className="text-[10px] px-1 py-0">{t('hsseDashboard.open', 'open')}</Badge>
          </div>
        </div>
      </div>
    </div>
  );
}

function SiteCard({ site }: { site: SiteEventData }) {
  const { t } = useTranslation();

  return (
    <div className="p-4 bg-muted/50 rounded-lg space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">{site.site_name}</p>
          <p className="text-xs text-muted-foreground">{site.branch_name}</p>
        </div>
        <TrendBadge current={site.total_events} previous={site.prev_total_events || 0} />
      </div>
      
      <div className="grid grid-cols-4 gap-2 border-t pt-3">
        <MetricCell label={t('hsseDashboard.incidents', 'Inc.')} value={site.incidents} />
        <MetricCell label={t('hsseDashboard.observations', 'Obs.')} value={site.observations} />
        <MetricCell label={t('hsseDashboard.actions', 'Act.')} value={site.total_actions || 0} variant={site.actions_open > 0 ? 'danger' : 'default'} />
        <MetricCell label={t('hsseDashboard.investigations', 'Inv.')} value={site.open_investigations || 0} />
      </div>
    </div>
  );
}

function DepartmentCard({ dept }: { dept: DepartmentEventData }) {
  const { t } = useTranslation();
  const hasOverdue = (dept.actions_overdue || 0) > 0;

  return (
    <div className="p-4 bg-muted/50 rounded-lg space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{dept.department_name}</span>
        </div>
        <TrendBadge current={dept.total_events} previous={dept.prev_total_events || 0} />
      </div>
      
      <div className="grid grid-cols-4 gap-2 border-t pt-3">
        <MetricCell label={t('hsseDashboard.incidents', 'Inc.')} value={dept.incidents} />
        <MetricCell label={t('hsseDashboard.observations', 'Obs.')} value={dept.observations || 0} />
        <MetricCell 
          label={t('hsseDashboard.actions', 'Act.')} 
          value={dept.total_actions || 0} 
          variant={hasOverdue ? 'danger' : 'default'} 
        />
        <MetricCell label={t('hsseDashboard.investigations', 'Inv.')} value={dept.open_investigations || 0} />
      </div>
      
      <div className="flex gap-2 text-xs">
        <Badge variant="outline" className="text-[10px]">{dept.events_open || 0} {t('hsseDashboard.openStatus', 'Open')}</Badge>
        <Badge variant="outline" className="text-[10px] bg-green-50 dark:bg-green-950/20">{dept.events_closed || 0} {t('hsseDashboard.closedStatus', 'Closed')}</Badge>
        {hasOverdue && (
          <Badge variant="destructive" className="text-[10px]">{dept.actions_overdue} {t('hsseDashboard.overdueStatus', 'Overdue')}</Badge>
        )}
      </div>
    </div>
  );
}

export function EnhancedLocationAnalytics({ data }: Props) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          {t('hsseDashboard.locationAnalytics', 'Location Analytics')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="branch" dir={direction}>
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="branch">{t('hsseDashboard.byBranch', 'By Branch')}</TabsTrigger>
            <TabsTrigger value="site">{t('hsseDashboard.bySite', 'By Site')}</TabsTrigger>
            <TabsTrigger value="department">{t('hsseDashboard.byDepartment', 'By Dept')}</TabsTrigger>
          </TabsList>

          <TabsContent value="branch" className="space-y-3 max-h-[400px] overflow-y-auto">
            {data.by_branch.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">{t('hsseDashboard.noData', 'No data available')}</p>
            ) : (
              data.by_branch.map((branch) => (
                <BranchCard key={branch.branch_id} branch={branch} />
              ))
            )}
          </TabsContent>

          <TabsContent value="site" className="space-y-3 max-h-[400px] overflow-y-auto">
            {data.by_site.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">{t('hsseDashboard.noData', 'No data available')}</p>
            ) : (
              data.by_site.map((site) => (
                <SiteCard key={site.site_id} site={site} />
              ))
            )}
          </TabsContent>

          <TabsContent value="department" className="space-y-3 max-h-[400px] overflow-y-auto">
            {data.by_department.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">{t('hsseDashboard.noData', 'No data available')}</p>
            ) : (
              data.by_department.map((dept) => (
                <DepartmentCard key={dept.department_id} dept={dept} />
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
