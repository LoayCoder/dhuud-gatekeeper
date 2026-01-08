import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Search, FileWarning, CheckCircle, ChevronDown, ChevronUp, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

interface HSSEEventsSummaryCardProps {
  open: number;
  investigating: number;
  closed: number;
  total: number;
}

type FilterType = "open" | "investigating" | "closed" | null;

const ITEMS_PER_PAGE = 5;

export function HSSEEventsSummaryCard({
  open,
  investigating,
  closed,
  total,
}: HSSEEventsSummaryCardProps) {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>(null);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  // Fetch incidents for inline display
  const { data: incidents = [] } = useQuery({
    queryKey: ["contractor-dashboard-incidents", profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data } = await supabase
        .from("incidents")
        .select("id, reference_id, title, status, incident_type, severity, incident_date, site:sites(name)")
        .eq("tenant_id", profile.tenant_id)
        .is("deleted_at", null)
        .order("incident_date", { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: !!profile?.tenant_id && isExpanded,
  });

  const handleStatusClick = (status: FilterType) => {
    setActiveFilter(activeFilter === status ? null : status);
    setIsExpanded(true);
    setVisibleCount(ITEMS_PER_PAGE);
  };

  const clearFilter = () => {
    setActiveFilter(null);
    setVisibleCount(ITEMS_PER_PAGE);
  };

  const openStatuses = ["reported", "open", "pending_review"];
  const investigatingStatuses = ["investigation_in_progress", "under_investigation"];
  const closedStatuses = ["closed", "resolved", "no_action_required"];

  const filteredIncidents = useMemo(() => {
    if (!activeFilter) return incidents;
    
    const statusMap: Record<string, string[]> = {
      open: openStatuses,
      investigating: investigatingStatuses,
      closed: closedStatuses,
    };
    
    return incidents.filter((i) => statusMap[activeFilter]?.includes(i.status));
  }, [incidents, activeFilter]);

  const visibleIncidents = filteredIncidents.slice(0, visibleCount);

  const statusCards = [
    {
      key: "open" as FilterType,
      label: t("contractors.dashboard.open", "Open"),
      count: open,
      icon: AlertTriangle,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
    {
      key: "investigating" as FilterType,
      label: t("contractors.dashboard.investigating", "Under Investigation"),
      count: investigating,
      icon: Search,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      key: "closed" as FilterType,
      label: t("contractors.dashboard.closed", "Closed"),
      count: closed,
      icon: CheckCircle,
      color: "text-success",
      bgColor: "bg-success/10",
    },
  ];

  const getStatusBadge = (status: string) => {
    if (openStatuses.includes(status)) {
      return <Badge variant="destructive">{t("common.open", "Open")}</Badge>;
    }
    if (investigatingStatuses.includes(status)) {
      return <Badge variant="outline" className="border-warning text-warning">{t("common.investigating", "Investigating")}</Badge>;
    }
    return <Badge variant="outline" className="border-success text-success">{t("common.closed", "Closed")}</Badge>;
  };

  const getSeverityBadge = (severity: string) => {
    const severityColors: Record<string, string> = {
      critical: "bg-destructive text-destructive-foreground",
      high: "bg-destructive/80 text-destructive-foreground",
      medium: "bg-warning text-warning-foreground",
      low: "bg-muted text-muted-foreground",
    };
    return (
      <Badge className={severityColors[severity] || severityColors.low}>
        {severity}
      </Badge>
    );
  };

  return (
    <Card>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="p-2 rounded-full bg-destructive/10">
                <FileWarning className="h-5 w-5 text-destructive" />
              </div>
              {t("contractors.dashboard.hsseEvents", "HSSE Events")}
              <Badge variant="secondary">{total}</Badge>
            </CardTitle>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Status Cards */}
          <div className="grid grid-cols-3 gap-2">
            {statusCards.map((card) => (
              <button
                key={card.key}
                onClick={() => handleStatusClick(card.key)}
                className={cn(
                  "p-3 rounded-lg text-center transition-all cursor-pointer",
                  card.bgColor,
                  activeFilter === card.key && "ring-2 ring-primary ring-offset-2"
                )}
              >
                <card.icon className={cn("h-5 w-5 mx-auto mb-1", card.color)} />
                <p className="text-xl font-bold">{card.count}</p>
                <p className="text-xs text-muted-foreground">{card.label}</p>
              </button>
            ))}
          </div>

          <CollapsibleContent className="space-y-3">
            {/* Active Filter Indicator */}
            {activeFilter && (
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted">
                <span className="text-sm">
                  {t("contractors.dashboard.showingFiltered", "Showing {{status}} events only", {
                    status: statusCards.find((s) => s.key === activeFilter)?.label,
                  })}
                </span>
                <Button variant="ghost" size="sm" onClick={clearFilter}>
                  <X className="h-4 w-4 me-1" />
                  {t("common.clearFilter", "Clear")}
                </Button>
              </div>
            )}

            {/* Incidents List */}
            {visibleIncidents.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                {t("contractors.dashboard.noEventsMatch", "No events match this filter")}
              </div>
            ) : (
              <div className="space-y-2">
                {visibleIncidents.map((incident) => (
                  <div
                    key={incident.id}
                    className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{incident.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {incident.reference_id} • {incident.site?.name || "—"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {incident.incident_date && format(new Date(incident.incident_date), "dd/MM/yyyy")}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {getStatusBadge(incident.status)}
                        {incident.severity && getSeverityBadge(incident.severity)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Load More */}
            {filteredIncidents.length > visibleCount && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setVisibleCount((prev) => prev + ITEMS_PER_PAGE)}
              >
                {t("common.loadMore", "Load More")} ({filteredIncidents.length - visibleCount} {t("common.remaining", "remaining")})
              </Button>
            )}
          </CollapsibleContent>
        </CardContent>
      </Collapsible>
    </Card>
  );
}
