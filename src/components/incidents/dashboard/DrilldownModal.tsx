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
  critical: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30",
  high: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30",
  medium: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
  low: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30",
};

const STATUS_COLORS: Record<string, string> = {
  submitted: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  expert_screening: "bg-purple-500/15 text-purple-700 dark:text-purple-400",
  pending_manager_approval: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  investigation_in_progress: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400",
  pending_closure: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
  closed: "bg-green-500/15 text-green-700 dark:text-green-400",
  returned: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  rejected: "bg-red-500/15 text-red-700 dark:text-red-400",
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
    navigate(`/incidents/investigate?incidentId=${incidentId}`);
  };

  const handleViewAll = () => {
    const params = new URLSearchParams();
    if (filters.eventType) params.set("eventType", filters.eventType);
    if (filters.severity) params.set("severity", filters.severity);
    if (filters.status) params.set("status", filters.status);
    if (filters.branchId) params.set("branchId", filters.branchId);
    closeDrilldown();
    navigate(`/incidents/investigate${params.toString() ? `?${params.toString()}` : ""}`);
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
                    {t(`hsseDashboard.eventTypes.${event.event_type}`, event.event_type)}
                  </Badge>
                  {event.severity && (
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${SEVERITY_COLORS[event.severity] || ""}`}
                    >
                      {t(`severity.${event.severity}`, event.severity)}
                    </Badge>
                  )}
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${STATUS_COLORS[event.status] || ""}`}
                  >
                    {t(`status.${event.status}`, event.status)}
                  </Badge>
                  <span className="text-xs text-muted-foreground min-w-[80px]">
                    {format(new Date(event.occurred_at), "dd MMM yyyy")}
                  </span>
                  <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
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
