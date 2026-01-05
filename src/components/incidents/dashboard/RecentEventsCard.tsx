import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, Eye, AlertTriangle } from "lucide-react";
import { useRecentEvents, type RecentEvent } from "@/hooks/use-recent-events";
import { StatusBadge } from "@/components/ui/status-badge";
import { getStatusFromPriority, getStatusFromWorkflow } from "@/styles/design-tokens";

function EventRow({ event }: { event: RecentEvent }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const isObservation = event.event_type === 'observation';
  const timeAgo = formatDistanceToNow(new Date(event.created_at), { addSuffix: true });
  const severityStatus = getStatusFromPriority(event.severity);
  const workflowStatus = getStatusFromWorkflow(event.status);

  return (
    <div 
      className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
      onClick={() => navigate(`/incidents/${event.id}`)}
    >
      <div className={`p-2 rounded-lg ${isObservation ? 'bg-info/10' : 'bg-warning/10'}`}>
        {isObservation ? (
          <Eye className="h-4 w-4 text-info" />
        ) : (
          <AlertTriangle className="h-4 w-4 text-warning" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{event.reference_id}</span>
          {event.severity && (
            <StatusBadge status={severityStatus} size="sm">
              {t(`severity.${event.severity}`, event.severity)}
            </StatusBadge>
          )}
        </div>
        <p className="text-sm text-muted-foreground truncate mt-0.5">
          {event.description_preview}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <StatusBadge status={workflowStatus} size="sm">
            {t(`status.${event.status}`, event.status)}
          </StatusBadge>
          <span className="text-xs text-muted-foreground">{timeAgo}</span>
        </div>
      </div>
    </div>
  );
}

export function RecentEventsCard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: events, isLoading } = useRecentEvents(3);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">{t('hsseDashboard.recentEvents', 'Recent Events')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3 p-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">{t('hsseDashboard.recentEvents', 'Recent Events')}</CardTitle>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-primary"
          onClick={() => navigate('/incidents/investigate')}
        >
          {t('hsseDashboard.viewAll')}
          <ArrowRight className="h-4 w-4 ms-1 rtl:rotate-180" />
        </Button>
      </CardHeader>
      <CardContent>
        {events && events.length > 0 ? (
          <div className="space-y-1">
            {events.map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            {t('hsseDashboard.noData')}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
