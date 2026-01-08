import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { FileCheck, ChevronDown, ChevronUp, X, Clock, CheckCircle, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, isBefore } from "date-fns";

interface PTWStatusCardProps {
  active: number;
  pending: number;
  expired: number;
  total: number;
}

type FilterType = "active" | "pending" | "expired" | null;

const ITEMS_PER_PAGE = 5;

export function PTWStatusCard({ active, pending, expired, total }: PTWStatusCardProps) {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>(null);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  // Fetch permits
  const { data: permits = [] } = useQuery({
    queryKey: ["contractor-dashboard-permits", profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data } = await supabase
        .from("ptw_permits")
        .select(`
          id, 
          permit_number, 
          permit_type, 
          status, 
          valid_from, 
          valid_until,
          site:sites(name),
          requested_by_profile:profiles!ptw_permits_requested_by_fkey(full_name)
        `)
        .eq("tenant_id", profile.tenant_id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: !!profile?.tenant_id && isExpanded,
  });

  const handleFilterClick = (filter: FilterType) => {
    setActiveFilter(activeFilter === filter ? null : filter);
    setIsExpanded(true);
    setVisibleCount(ITEMS_PER_PAGE);
  };

  const clearFilter = () => {
    setActiveFilter(null);
    setVisibleCount(ITEMS_PER_PAGE);
  };

  const now = new Date();

  const filteredPermits = useMemo(() => {
    if (!activeFilter) return permits;
    
    return permits.filter((p) => {
      const isExpiredByDate = p.valid_until && isBefore(new Date(p.valid_until), now);
      
      switch (activeFilter) {
        case "active":
          return (p.status === "active" || p.status === "approved") && !isExpiredByDate;
        case "pending":
          return p.status === "pending" || p.status === "draft";
        case "expired":
          return p.status === "expired" || isExpiredByDate;
        default:
          return true;
      }
    });
  }, [permits, activeFilter, now]);

  const visiblePermits = filteredPermits.slice(0, visibleCount);

  const statusCards = [
    {
      key: "active" as FilterType,
      label: t("contractors.dashboard.active", "Active"),
      count: active,
      icon: CheckCircle,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      key: "pending" as FilterType,
      label: t("contractors.dashboard.pending", "Pending"),
      count: pending,
      icon: Clock,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      key: "expired" as FilterType,
      label: t("contractors.dashboard.expired", "Expired"),
      count: expired,
      icon: AlertTriangle,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
  ];

  const getStatusBadge = (status: string, validUntil: string | null) => {
    const isExpiredByDate = validUntil && isBefore(new Date(validUntil), now);
    
    if (status === "expired" || isExpiredByDate) {
      return <Badge variant="destructive">{t("common.expired", "Expired")}</Badge>;
    }
    if (status === "active" || status === "approved") {
      return <Badge variant="outline" className="border-success text-success">{t("common.active", "Active")}</Badge>;
    }
    return <Badge variant="outline" className="border-warning text-warning">{t("common.pending", "Pending")}</Badge>;
  };

  return (
    <Card>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="p-2 rounded-full bg-info/10">
                <FileCheck className="h-5 w-5 text-info" />
              </div>
              {t("contractors.dashboard.ptwStatus", "Permit to Work")}
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
                onClick={() => handleFilterClick(card.key)}
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
            {/* Active Filter */}
            {activeFilter && (
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted">
                <span className="text-sm">
                  {t("contractors.dashboard.showingFiltered", "Showing {{status}} permits only", {
                    status: statusCards.find((s) => s.key === activeFilter)?.label,
                  })}
                </span>
                <Button variant="ghost" size="sm" onClick={clearFilter}>
                  <X className="h-4 w-4 me-1" />
                  {t("common.clearFilter", "Clear")}
                </Button>
              </div>
            )}

            {/* Permits List */}
            {visiblePermits.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                {t("contractors.dashboard.noPermitsMatch", "No permits match this filter")}
              </div>
            ) : (
              <div className="space-y-2">
                {visiblePermits.map((permit) => (
                  <div
                    key={permit.id}
                    className="p-3 rounded-lg border bg-card"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{permit.permit_number}</p>
                        <p className="text-sm text-muted-foreground">
                          {permit.permit_type} • {permit.site?.name || "—"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {permit.valid_from && format(new Date(permit.valid_from), "dd/MM")} - {permit.valid_until && format(new Date(permit.valid_until), "dd/MM/yyyy")}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        {getStatusBadge(permit.status, permit.valid_until)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Load More */}
            {filteredPermits.length > visibleCount && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setVisibleCount((prev) => prev + ITEMS_PER_PAGE)}
              >
                {t("common.loadMore", "Load More")}
              </Button>
            )}
          </CollapsibleContent>
        </CardContent>
      </Collapsible>
    </Card>
  );
}
