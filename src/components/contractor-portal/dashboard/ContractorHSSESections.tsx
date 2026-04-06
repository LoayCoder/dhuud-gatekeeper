import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Eye, AlertTriangle, ClipboardList, Scale, Clock, AlertCircle, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import type {
  HSSEObservationStats,
  HSSEIncidentStats,
  HSSEActionStats,
  HSSEViolationStats,
} from "@/features/contractors/hooks/use-contractor-portal-hsse";

interface ContractorHSSESectionsProps {
  observations: HSSEObservationStats | undefined;
  incidents: HSSEIncidentStats | undefined;
  actions: HSSEActionStats | undefined;
  violations: HSSEViolationStats | undefined;
  isLoading: boolean;
}

const SEVERITY_COLORS: Record<string, string> = {
  level_1: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  level_2: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  level_3: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  level_4: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  level_5: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

function severityLabel(sev: string): string {
  const map: Record<string, string> = { level_1: 'L1', level_2: 'L2', level_3: 'L3', level_4: 'L4', level_5: 'L5' };
  return map[sev] || sev;
}

function formatDate(d: string | null) {
  if (!d) return "—";
  try { return format(new Date(d), "dd MMM yyyy"); } catch { return d; }
}

function StatusBadge({ status }: { status: string }) {
  const label = status.replace(/_/g, " ");
  const isTerminal = ["closed", "verified", "investigation_closed"].includes(status);
  return (
    <Badge variant={isTerminal ? "default" : "outline"} className={isTerminal ? "bg-green-600" : ""}>
      {label}
    </Badge>
  );
}

export default function ContractorHSSESections({
  observations,
  incidents,
  actions,
  violations,
  isLoading,
}: ContractorHSSESectionsProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="animate-pulse">
            <CardHeader><div className="h-5 w-32 bg-muted rounded" /></CardHeader>
            <CardContent><div className="h-20 bg-muted rounded" /></CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const navigateToIncident = (id: string) => {
    navigate(`/incidents/${id}`);
  };

  return (
    <div className="space-y-6">
      {/* HSSE Summary Stats Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t("contractorPortal.hsse.observations", "Observations")}
            </CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{observations?.total || 0}</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
              <span className="text-green-600 font-medium">{observations?.closed || 0} {t("common.closed", "closed")}</span>
              <span>·</span>
              <span className="text-blue-600 font-medium">{observations?.open || 0} {t("common.open", "open")}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t("contractorPortal.hsse.incidents", "Incidents")}
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{incidents?.total || 0}</div>
            {(incidents?.highSeverityCount || 0) > 0 && (
              <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                <AlertCircle className="h-3 w-3" />
                {incidents?.highSeverityCount} {t("contractorPortal.hsse.highSeverity", "high severity (L3+)")}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t("contractorPortal.hsse.actions", "Corrective Actions")}
            </CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{actions?.total || 0}</div>
            <div className="flex items-center gap-2 text-xs mt-1">
              {(actions?.overdue || 0) > 0 && (
                <span className="text-destructive font-medium flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {actions!.overdue} {t("contractorPortal.hsse.overdue", "overdue")}
                </span>
              )}
              {(actions?.upcoming || 0) > 0 && (
                <span className="text-warning font-medium">
                  {actions!.upcoming} {t("contractorPortal.hsse.dueSoon", "due soon")}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t("contractorPortal.hsse.violations", "Violations")}
            </CardTitle>
            <Scale className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{violations?.total || 0}</div>
            {(violations?.active || 0) > 0 && (
              <p className="text-xs text-warning flex items-center gap-1 mt-1">
                <AlertCircle className="h-3 w-3" />
                {violations?.active} {t("contractorPortal.hsse.activeViolations", "active")}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detail sections */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Observations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Eye className="h-5 w-5" />
              {t("contractorPortal.hsse.recentObservations", "Recent Observations")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(!observations?.recent || observations.recent.length === 0) ? (
              <p className="text-muted-foreground text-sm">
                {t("contractorPortal.hsse.noObservations", "No observations recorded")}
              </p>
            ) : (
              <div className="space-y-3">
                {observations.recent.map(obs => (
                  <div
                    key={obs.id}
                    className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => navigateToIncident(obs.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && navigateToIncident(obs.id)}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{obs.title}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(obs.occurred_at)}</p>
                    </div>
                    <div className="flex items-center gap-2 ms-2">
                      {obs.severity_v2 && (
                        <Badge className={SEVERITY_COLORS[obs.severity_v2] || ""} variant="outline">
                          {severityLabel(obs.severity_v2)}
                        </Badge>
                      )}
                      <StatusBadge status={obs.status} />
                      <ChevronRight className="h-4 w-4 text-muted-foreground rtl:rotate-180" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Incidents */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-5 w-5" />
              {t("contractorPortal.hsse.recentIncidents", "Recent Incidents")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(!incidents?.recent || incidents.recent.length === 0) ? (
              <p className="text-muted-foreground text-sm">
                {t("contractorPortal.hsse.noIncidents", "No incidents recorded")}
              </p>
            ) : (
              <div className="space-y-3">
                {incidents.recent.map(inc => (
                  <div
                    key={inc.id}
                    className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => navigateToIncident(inc.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && navigateToIncident(inc.id)}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{inc.title}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(inc.occurred_at)}</p>
                    </div>
                    <div className="flex items-center gap-2 ms-2">
                      {inc.severity_v2 && (
                        <Badge className={SEVERITY_COLORS[inc.severity_v2] || ""} variant="outline">
                          {severityLabel(inc.severity_v2)}
                        </Badge>
                      )}
                      <StatusBadge status={inc.status} />
                      <ChevronRight className="h-4 w-4 text-muted-foreground rtl:rotate-180" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Corrective Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="h-5 w-5" />
              {t("contractorPortal.hsse.correctiveActions", "Corrective Actions")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(!actions?.recent || actions.recent.length === 0) ? (
              <p className="text-muted-foreground text-sm">
                {t("contractorPortal.hsse.noActions", "No corrective actions")}
              </p>
            ) : (
              <div className="space-y-3">
                {actions.recent.map(action => {
                  const isOverdue = action.due_date && action.due_date < new Date().toISOString() && !['closed', 'verified'].includes(action.status);
                  return (
                    <div
                      key={action.id}
                      className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors ${isOverdue ? 'border-destructive/50 bg-destructive/5' : ''}`}
                      onClick={() => navigateToIncident(action.incident_id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && navigateToIncident(action.incident_id)}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{action.title}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{formatDate(action.due_date)}</span>
                          {action.assignee_name && (
                            <>
                              <span>·</span>
                              <span>{action.assignee_name}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ms-2">
                        {isOverdue && (
                          <Badge variant="destructive" className="text-xs">
                            {t("contractorPortal.hsse.overdue", "overdue")}
                          </Badge>
                        )}
                        <StatusBadge status={action.status} />
                        <ChevronRight className="h-4 w-4 text-muted-foreground rtl:rotate-180" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Violations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Scale className="h-5 w-5" />
              {t("contractorPortal.hsse.violationsDetail", "Violations & Penalties")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(!violations?.recent || violations.recent.length === 0) ? (
              <p className="text-muted-foreground text-sm">
                {t("contractorPortal.hsse.noViolations", "No violations recorded")}
              </p>
            ) : (
              <div className="space-y-3">
                {violations.recent.map(v => (
                  <div
                    key={v.id}
                    className={`flex items-center justify-between p-3 border rounded-lg ${v.incident_id ? 'cursor-pointer hover:bg-muted/50' : ''} transition-colors`}
                    onClick={() => v.incident_id && navigateToIncident(v.incident_id)}
                    role={v.incident_id ? "button" : undefined}
                    tabIndex={v.incident_id ? 0 : undefined}
                    onKeyDown={(e) => v.incident_id && e.key === 'Enter' && navigateToIncident(v.incident_id)}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">
                        {v.violation_type_name || t("contractorPortal.hsse.violation", "Violation")}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatDate(v.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-2 ms-2">
                      {v.total_fine_amount != null && v.total_fine_amount > 0 && (
                        <Badge variant="outline" className="text-destructive border-destructive/30">
                          SAR {v.total_fine_amount.toLocaleString()}
                        </Badge>
                      )}
                      <Badge variant={v.final_status === 'pending' || !v.final_status ? 'secondary' : 'outline'}>
                        {(v.final_status || 'pending').replace(/_/g, ' ')}
                      </Badge>
                      {v.incident_id && <ChevronRight className="h-4 w-4 text-muted-foreground rtl:rotate-180" />}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
