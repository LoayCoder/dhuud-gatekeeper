import { useState } from "react";
import { AlertTriangle, CircleDot, Search, CheckCircle2, ChevronDown, ChevronUp, Eye, FileWarning } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import type { ClientSiteRepIncidentSummary, ClientSiteRepIncidentDetail } from "@/hooks/contractor-management/use-client-site-rep-data";

interface IncidentsSummaryCardProps {
  summary: ClientSiteRepIncidentSummary;
  recentIncidents?: ClientSiteRepIncidentDetail[];
}

export function IncidentsSummaryCard({ summary, recentIncidents = [] }: IncidentsSummaryCardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleStatusClick = (e: React.MouseEvent, status: string) => {
    e.stopPropagation();
    setIsExpanded(true);
  };

  const handleViewAll = () => {
    navigate("/incidents");
  };

  const stats = [
    {
      label: t("clientSiteRep.open", "Open"),
      value: summary.open,
      icon: CircleDot,
      color: "text-red-600 dark:text-red-400",
      bg: "bg-red-100 dark:bg-red-900/30",
      status: "open",
    },
    {
      label: t("clientSiteRep.underInvestigation", "Under Investigation"),
      value: summary.under_investigation,
      icon: Search,
      color: "text-yellow-600 dark:text-yellow-400",
      bg: "bg-yellow-100 dark:bg-yellow-900/30",
      status: "investigation_in_progress",
    },
    {
      label: t("clientSiteRep.closed", "Closed"),
      value: summary.closed,
      icon: CheckCircle2,
      color: "text-green-600 dark:text-green-400",
      bg: "bg-green-100 dark:bg-green-900/30",
      status: "closed",
    },
  ];

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "closed":
      case "investigation_closed":
        return "default";
      case "investigation_in_progress":
        return "secondary";
      case "submitted":
      case "pending_review":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const getEventTypeIcon = (eventType: string) => {
    if (eventType === "observation") {
      return <Eye className="h-4 w-4 text-blue-500" />;
    }
    return <FileWarning className="h-4 w-4 text-red-500" />;
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg">
            <CardTitle className="flex items-center justify-between text-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-primary" />
                {t("clientSiteRep.hsseEvents", "HSSE Events")}
                <span className="text-muted-foreground font-normal">({summary.total})</span>
              </div>
              {isExpanded ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              )}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className={`${stat.bg} rounded-lg p-3 text-center cursor-pointer hover:opacity-80 transition-opacity`}
                onClick={(e) => handleStatusClick(e, stat.status)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleStatusClick(e as unknown as React.MouseEvent, stat.status)}
              >
                <stat.icon className={`h-5 w-5 mx-auto ${stat.color}`} />
                <p className="text-2xl font-bold mt-1">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </CardContent>

        <CollapsibleContent>
          <div className="border-t px-4 pb-4 pt-3 space-y-2">
            <p className="text-sm font-medium text-muted-foreground mb-3">
              {t("clientSiteRep.recentEvents", "Recent HSSE Events")}
            </p>
            
            {recentIncidents.length > 0 ? (
              recentIncidents.map((incident) => (
                <div
                  key={incident.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {getEventTypeIcon(incident.event_type)}
                      <p className="font-medium truncate">{incident.incident_number}</p>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-1">
                      {incident.description || t("clientSiteRep.noDescription", "No description")}
                    </p>
                    {incident.occurred_at && (
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(incident.occurred_at), "dd MMM yyyy")}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 ms-3">
                    <Badge variant={getStatusBadgeVariant(incident.status)}>
                      {incident.status.replace(/_/g, " ")}
                    </Badge>
                    <span className="text-xs text-muted-foreground capitalize">
                      {incident.event_type}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t("clientSiteRep.noEventsFound", "No HSSE events found")}
              </p>
            )}

            <Button 
              variant="outline" 
              className="w-full mt-3"
              onClick={handleViewAll}
            >
              {t("clientSiteRep.viewAllEvents", "View All HSSE Events")}
            </Button>
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
