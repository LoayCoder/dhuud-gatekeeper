import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Users, ChevronDown, ChevronUp, Clock, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, formatDistanceToNow } from "date-fns";

interface OnsiteWorkersCardProps {
  count: number;
}

const ITEMS_PER_PAGE = 10;

export function OnsiteWorkersCard({ count }: OnsiteWorkersCardProps) {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  // Fetch onsite workers (gate entries without exit) - use correct columns
  const { data: onsiteWorkers = [] } = useQuery({
    queryKey: ["contractor-dashboard-onsite-workers", profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data } = await supabase
        .from("gate_entry_logs")
        .select("id, entry_time, person_name, worker_id, site_id, project_id")
        .eq("tenant_id", profile.tenant_id)
        .is("exit_time", null)
        .order("entry_time", { ascending: false })
        .limit(100);
      return data || [];
    },
    enabled: !!profile?.tenant_id && isExpanded,
    refetchInterval: 60000, // Refresh every minute for real-time feel
  });

  const visibleWorkers = onsiteWorkers.slice(0, visibleCount);

  return (
    <Card className="border-info/30">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="p-2 rounded-full bg-info/10">
                <Users className="h-5 w-5 text-info" />
              </div>
              {t("contractors.dashboard.onsiteWorkers", "Onsite Workers")}
            </CardTitle>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Count Display */}
          <div className="flex items-center justify-center p-4 rounded-lg bg-info/10">
            <div className="text-center">
              <p className="text-4xl font-bold text-info">{count}</p>
              <p className="text-sm text-muted-foreground">
                {t("contractors.dashboard.currentlyOnsite", "Currently On-Site")}
              </p>
              <div className="flex items-center justify-center gap-1 mt-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{t("contractors.dashboard.realtime", "Real-time")}</span>
              </div>
            </div>
          </div>

          <CollapsibleContent className="space-y-3">
            {/* Workers List */}
            {visibleWorkers.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                {t("contractors.dashboard.noOnsiteWorkers", "No workers currently on-site")}
              </div>
            ) : (
              <div className="space-y-2">
                {visibleWorkers.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-3 rounded-lg border bg-card"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">
                          {entry.person_name || t("common.unknown", "Unknown")}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          {entry.site_id && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              Site
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant="outline" className="border-info text-info">
                          {t("common.onsite", "On-Site")}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {entry.entry_time && formatDistanceToNow(new Date(entry.entry_time), { addSuffix: true })}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {entry.entry_time && format(new Date(entry.entry_time), "HH:mm")}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Load More */}
            {onsiteWorkers.length > visibleCount && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setVisibleCount((prev) => prev + ITEMS_PER_PAGE)}
              >
                {t("common.loadMore", "Load More")} ({onsiteWorkers.length - visibleCount} {t("common.remaining", "remaining")})
              </Button>
            )}
          </CollapsibleContent>
        </CardContent>
      </Collapsible>
    </Card>
  );
}
