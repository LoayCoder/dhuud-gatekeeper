import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Ban, ChevronDown, ChevronUp, X, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, isAfter, subDays } from "date-fns";

interface BlacklistSummaryCardProps {
  total: number;
  recentCount: number;
}

type FilterType = "all" | "recent" | null;

const ITEMS_PER_PAGE = 5;

export function BlacklistSummaryCard({ total, recentCount }: BlacklistSummaryCardProps) {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>(null);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  // Fetch blacklist entries
  const { data: entries = [] } = useQuery({
    queryKey: ["contractor-dashboard-blacklist", profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data } = await supabase
        .from("security_blacklist")
        .select(`
          id, 
          reason, 
          blacklist_type, 
          created_at,
          worker:contractor_workers(full_name, employee_id)
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

  const sevenDaysAgo = subDays(new Date(), 7);

  const filteredEntries = useMemo(() => {
    if (activeFilter === "recent") {
      return entries.filter((e) => isAfter(new Date(e.created_at), sevenDaysAgo));
    }
    return entries;
  }, [entries, activeFilter, sevenDaysAgo]);

  const visibleEntries = filteredEntries.slice(0, visibleCount);

  return (
    <Card className="border-destructive/30">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="p-2 rounded-full bg-destructive/10">
                <Ban className="h-5 w-5 text-destructive" />
              </div>
              {t("contractors.dashboard.blacklist", "Blacklist")}
            </CardTitle>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleFilterClick("all")}
              className={cn(
                "p-3 rounded-lg text-center transition-all cursor-pointer bg-destructive/10",
                activeFilter === "all" && "ring-2 ring-primary ring-offset-2"
              )}
            >
              <p className="text-2xl font-bold text-destructive">{total}</p>
              <p className="text-xs text-muted-foreground">
                {t("contractors.dashboard.totalBlacklisted", "Total Blacklisted")}
              </p>
            </button>
            <button
              onClick={() => handleFilterClick("recent")}
              className={cn(
                "p-3 rounded-lg text-center transition-all cursor-pointer bg-warning/10",
                activeFilter === "recent" && "ring-2 ring-primary ring-offset-2"
              )}
            >
              <div className="flex items-center justify-center gap-1">
                <Clock className="h-4 w-4 text-warning" />
                <p className="text-2xl font-bold text-warning">{recentCount}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("contractors.dashboard.recentlyAdded", "Added (7 days)")}
              </p>
            </button>
          </div>

          <CollapsibleContent className="space-y-3">
            {/* Active Filter */}
            {activeFilter && (
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted">
                <span className="text-sm">
                  {activeFilter === "recent" 
                    ? t("contractors.dashboard.showingRecent", "Showing recent additions only")
                    : t("contractors.dashboard.showingAll", "Showing all entries")
                  }
                </span>
                <Button variant="ghost" size="sm" onClick={clearFilter}>
                  <X className="h-4 w-4 me-1" />
                  {t("common.clearFilter", "Clear")}
                </Button>
              </div>
            )}

            {/* Entries List */}
            {visibleEntries.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                {total === 0 
                  ? t("contractors.dashboard.noBlacklistEntries", "No blacklisted workers")
                  : t("contractors.dashboard.noRecentEntries", "No recent additions")
                }
              </div>
            ) : (
              <div className="space-y-2">
                {visibleEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-3 rounded-lg border bg-card"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">
                          {entry.worker?.full_name || t("common.unknown", "Unknown")}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {entry.reason}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant="destructive" className="text-xs">
                          {entry.blacklist_type || "permanent"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(entry.created_at), "dd/MM/yyyy")}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Load More */}
            {filteredEntries.length > visibleCount && (
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
