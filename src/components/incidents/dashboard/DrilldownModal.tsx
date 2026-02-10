import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, AlertCircle } from "lucide-react";
import { useDrilldownContext } from "@/contexts/DrilldownContext";
import { useDrilldownEvents } from "@/hooks/use-drilldown-events";

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-destructive/15 text-destructive border-destructive/30",
  high: "bg-warning/15 text-warning border-warning/30",
  medium: "bg-warning/10 text-warning/80 border-warning/20",
  low: "bg-success/15 text-success border-success/30",
  level_5: "bg-destructive/20 text-destructive font-bold border-destructive/40",
  level_4: "bg-destructive/10 text-destructive border-destructive/20",
  level_3: "bg-warning/15 text-warning border-warning/30",
  level_2: "bg-warning/10 text-warning/80 border-warning/20",
  level_1: "bg-success/15 text-success border-success/30",
};

const STATUS_COLORS: Record<string, string> = {
  submitted: "bg-info/15 text-info",
  expert_screening: "bg-primary/15 text-primary",
  pending_manager_approval: "bg-warning/15 text-warning",
  investigation_in_progress: "bg-info/15 text-info",
  pending_closure: "bg-warning/15 text-warning",
  closed: "bg-success/15 text-success",
  returned: "bg-warning/15 text-warning",
  rejected: "bg-destructive/15 text-destructive",
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  observation: "bg-chart-1/15 text-chart-1",
  incident: "bg-chart-2/15 text-chart-2",
  near_miss: "bg-chart-3/15 text-chart-3",
  security_event: "bg-chart-4/15 text-chart-4",
  environmental_event: "bg-chart-5/15 text-chart-5",
};

export function DrilldownModal() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isOpen, filters, title, closeDrilldown } = useDrilldownContext();
  const { data: events, isLoading } = useDrilldownEvents(filters, isOpen);

  const handleViewIncident = (incidentId: string) => {
    closeDrilldown();
    if (filters.eventType === 'corrective_action') {
      navigate(`/incidents/my-actions?action=${incidentId}`);
    } else {
      navigate(`/incidents/investigate?incident=${incidentId}`);
    }
  };

  const handleViewAll = () => {
    if (filters.eventType === 'corrective_action') {
      const params = new URLSearchParams();
      if (filters.customFilter) params.set('filter', filters.customFilter);
      closeDrilldown();
      navigate(`/incidents/my-actions${params.toString() ? `?${params.toString()}` : ''}`);
      return;
    }

    const params = new URLSearchParams();
    if (filters.eventType) params.set("type", filters.eventType); // Fixed: map to 'type'
    if (filters.severity) params.set("severity", filters.severity);
    if (filters.status) params.set("status", filters.status);
    if (filters.branchId) params.set("branch", filters.branchId); // Fixed: map to 'branch'
    closeDrilldown();
    navigate(`/incidents${params.toString() ? `?${params.toString()}` : ""}`); // Fixed: navigate to list view
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeDrilldown()}>
      <DialogContent className="max-w-4xl max-h-[85vh] animate-scale-in">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <span>{title}</span>
            {filters.rootCauseCategory && (
              <Badge variant="outline" className="bg-chart-1/10 text-chart-1 border-chart-1/30">
                {t("hsseDashboard.drilldown.rootCause", "Root Cause")}: {filters.rootCauseCategory}
              </Badge>
            )}
            {events && (
              <Badge variant="secondary" className="font-normal">
                {events.length} {t("hsseDashboard.drilldown.eventsFound", "events")}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {t("hsseDashboard.drilldown.description", "Click on an event to view details")}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[500px] pe-4">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-lg border animate-pulse">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-5 flex-1" />
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-20" />
                </div>
              ))}
            </div>
          ) : events && events.length > 0 ? (
            <div className="space-y-2">
              {events.map((event, index) => (
                <div
                  key={event.id}
                  className="flex flex-wrap items-center gap-3 p-3 rounded-lg border bg-card/50 hover:bg-muted/50 cursor-pointer transition-all duration-200 hover:shadow-md animate-fade-in group"
                  style={{ animationDelay: `${index * 50}ms` }}
                  onClick={() => handleViewIncident(event.id)}
                >
                  <span className="font-mono text-xs text-muted-foreground min-w-[80px]">
                    {event.reference_id}
                  </span>
                  <span className="font-medium flex-1 min-w-[200px] truncate">
                    {event.title}
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-xs ${EVENT_TYPE_COLORS[event.event_type] || ""}`}
                  >
                    {String(t(`hsseDashboard.eventTypes.${event.event_type}`, event.event_type))}
                  </Badge>
                  {event.severity && (
                    <Badge
                      variant="outline"
                      className={`text-xs ${SEVERITY_COLORS[event.severity] || ""}`}
                    >
                      {String(
                        t([`severity.${event.severity}.label`, `severity.${event.severity}`], { defaultValue: event.severity })
                      )}
                    </Badge>
                  )}
                  <div className="flex flex-col min-w-[100px] gap-1">
                    <Badge
                      variant="outline"
                      className={`text-xs w-fit ${STATUS_COLORS[event.status] || ""}`}
                    >
                      {String(t(`status.${event.status}`, event.status))}
                    </Badge>
                    {event.assignee_name ? (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <span className="i-lucide-user h-3 w-3" />
                        {event.assignee_name}
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground/60 italic flex items-center gap-1">
                        <span className="i-lucide-user h-3 w-3 opacity-50" />
                        {t('common.unassigned', 'Unassigned')}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col items-end min-w-[120px] gap-1 text-xs text-muted-foreground ml-auto">
                    <span>{format(new Date(event.occurred_at), "dd MMM yyyy")}</span>
                    {event.status !== 'closed' && (
                      <span className="text-[10px] font-medium text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full border border-orange-100">
                        {t('common.daysPending', '{{count}} days', {
                          count: Math.max(0, Math.floor((new Date().getTime() - new Date(event.updated_at).getTime()) / (1000 * 60 * 60 * 24)))
                        })}
                      </span>
                    )}
                  </div>

                  <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-2" />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground gap-3">
              <AlertCircle className="h-12 w-12 opacity-50" />
              <p>{t("hsseDashboard.drilldown.noEvents", "No events match the selected criteria")}</p>
            </div>
          )}
        </ScrollArea>

        {events && events.length > 0 && (
          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={handleViewAll}>
              {t("hsseDashboard.drilldown.viewAll", "View All in Investigation Workspace")}
              <ExternalLink className="h-4 w-4 ms-2" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
