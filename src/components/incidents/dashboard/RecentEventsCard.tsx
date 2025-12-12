import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, Eye, AlertTriangle } from "lucide-react";
import { useRecentEvents, type RecentEvent } from "@/hooks/use-recent-events";

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  low: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
};

const STATUS_COLORS: Record<string, string> = {
  submitted: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  expert_screening: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  investigation_in_progress: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  pending_closure: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  closed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
};

function EventRow({ event }: { event: RecentEvent }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const isObservation = event.event_type === 'observation';
  const timeAgo = formatDistanceToNow(new Date(event.created_at), { addSuffix: true });

  return (
    <div 
      className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent/50 cursor-pointer transition-colors"
      onClick={() => navigate(`/incidents/investigate?id=${event.id}`)}
    >
      <div className={`p-2 rounded-lg ${isObservation ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-orange-100 dark:bg-orange-900/30'}`}>
        {isObservation ? (
          <Eye className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        ) : (
          <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{event.reference_id}</span>
          {event.severity && (
            <Badge variant="outline" className={`text-xs ${SEVERITY_COLORS[event.severity] || ''}`}>
              {t(`severity.${event.severity}`, event.severity)}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground truncate mt-0.5">
          {event.description_preview}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="outline" className={`text-xs ${STATUS_COLORS[event.status] || 'bg-gray-100'}`}>
            {t(`status.${event.status}`, event.status)}
          </Badge>
          <span className="text-xs text-muted-foreground">{timeAgo}</span>
        </div>
      </div>
    </div>
  );
}

export function RecentEventsCard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: events, isLoading } = useRecentEvents(5);

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
