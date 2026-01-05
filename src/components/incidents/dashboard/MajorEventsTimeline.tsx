import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  AlertOctagon, 
  AlertTriangle, 
  Clock, 
  MapPin, 
  Building2,
  ChevronLeft,
  ChevronRight,
  ExternalLink
} from "lucide-react";
import { format } from "date-fns";
import { MajorEventItem } from "@/hooks/use-rca-analytics";

interface MajorEventsTimelineProps {
  events: MajorEventItem[];
  isLoading?: boolean;
}

const severityConfig = {
  critical: { 
    color: 'bg-destructive text-destructive-foreground', 
    icon: AlertOctagon,
    borderColor: 'border-s-destructive'
  },
  high: { 
    color: 'bg-warning text-warning-foreground', 
    icon: AlertTriangle,
    borderColor: 'border-s-warning'
  },
  medium: { 
    color: 'bg-warning/70 text-foreground', 
    icon: AlertTriangle,
    borderColor: 'border-s-warning/70'
  },
  low: { 
    color: 'bg-info text-info-foreground', 
    icon: AlertTriangle,
    borderColor: 'border-s-info'
  }
};

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  submitted: { label: 'Submitted', variant: 'secondary' },
  expert_screening: { label: 'Expert Screening', variant: 'outline' },
  pending_manager_approval: { label: 'Pending Approval', variant: 'outline' },
  investigation_in_progress: { label: 'Investigation', variant: 'default' },
  pending_closure: { label: 'Pending Closure', variant: 'outline' },
  closed: { label: 'Closed', variant: 'secondary' }
};

export function MajorEventsTimeline({ events, isLoading }: MajorEventsTimelineProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleEventClick = (eventId: string) => {
    navigate(`/incidents/investigate?incidentId=${eventId}`);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertOctagon className="h-5 w-5 text-destructive" />
            {t('hsseDashboard.majorEvents.title', 'Major Events')}
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[380px] animate-pulse bg-muted/30 rounded" />
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <AlertOctagon className="h-5 w-5 text-destructive" />
          {t('hsseDashboard.majorEvents.title', 'Major Events')}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {t('hsseDashboard.majorEvents.subtitle', 'Critical and high severity incidents requiring attention')}
        </p>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[380px] pe-4">
          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
              <AlertTriangle className="h-12 w-12 mb-3 opacity-30" />
              <p>{t('hsseDashboard.majorEvents.noEvents', 'No major events in the selected period')}</p>
            </div>
          ) : (
            <div className="relative space-y-4">
              {/* Timeline line */}
              <div className="absolute top-0 bottom-0 start-[11px] w-0.5 bg-border" />
              
              {events.map((event, index) => {
                const severity = severityConfig[event.severity] || severityConfig.medium;
                const SeverityIcon = severity.icon;
                const status = statusConfig[event.status] || { label: event.status, variant: 'secondary' as const };

                return (
                  <div 
                    key={event.id} 
                    className="relative ps-8 group"
                  >
                    {/* Timeline dot */}
                    <div className={`absolute start-0 top-2 h-6 w-6 rounded-full ${severity.color} flex items-center justify-center shadow-sm`}>
                      <SeverityIcon className="h-3.5 w-3.5" />
                    </div>
                    
                    {/* Event card */}
                    <div 
                      className={`border-s-4 ${severity.borderColor} rounded-lg border bg-card p-3 hover:shadow-md transition-shadow cursor-pointer`}
                      onClick={() => handleEventClick(event.id)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <Badge className={severity.color} variant="secondary">
                              {event.severity.toUpperCase()}
                            </Badge>
                            <Badge variant={status.variant}>
                              {status.label}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {event.reference_id}
                            </span>
                          </div>
                          
                          <h4 className="font-medium text-sm line-clamp-2 mb-2">
                            {event.title}
                          </h4>
                          
                          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {event.occurred_at ? format(new Date(event.occurred_at), 'MMM d, yyyy') : 'N/A'}
                            </span>
                            
                            {event.branch_name && (
                              <span className="flex items-center gap-1">
                                <Building2 className="h-3 w-3" />
                                {event.branch_name}
                              </span>
                            )}
                            
                            {event.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                <span className="truncate max-w-[120px]">{event.location}</span>
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
