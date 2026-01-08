import { useState, useMemo } from "react";
import { Users, CheckCircle, Clock, XCircle, Ban, Shield, Phone, ChevronDown, ChevronUp, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useTranslation } from "react-i18next";
import type { ClientSiteRepWorkerSummary, ClientSiteRepWorkerDetail } from "@/hooks/contractor-management/use-client-site-rep-data";

interface WorkersSummaryCardProps {
  summary: ClientSiteRepWorkerSummary;
  safetyOfficerCount?: number;
  allWorkers?: ClientSiteRepWorkerDetail[];
}

const ITEMS_PER_PAGE = 10;

export function WorkersSummaryCard({ summary, safetyOfficerCount = 0, allWorkers = [] }: WorkersSummaryCardProps) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  const handleStatusClick = (e: React.MouseEvent, status: string) => {
    e.stopPropagation();
    if (activeFilter === status) {
      setActiveFilter(null);
    } else {
      setActiveFilter(status);
    }
    setIsExpanded(true);
    setVisibleCount(ITEMS_PER_PAGE);
  };

  const clearFilter = () => {
    setActiveFilter(null);
    setVisibleCount(ITEMS_PER_PAGE);
  };

  // Calculate safety ratio
  const safetyRatio = safetyOfficerCount > 0 && summary.total > 0
    ? Math.ceil(summary.total / safetyOfficerCount)
    : 0;

  const stats = [
    {
      label: t("clientSiteRep.approved", "Approved"),
      value: summary.approved,
      icon: CheckCircle,
      color: "text-green-600 dark:text-green-400",
      bg: "bg-green-100 dark:bg-green-900/30",
      status: "approved",
    },
    {
      label: t("clientSiteRep.pending", "Pending"),
      value: summary.pending,
      icon: Clock,
      color: "text-yellow-600 dark:text-yellow-400",
      bg: "bg-yellow-100 dark:bg-yellow-900/30",
      status: "pending",
    },
    {
      label: t("clientSiteRep.rejected", "Rejected"),
      value: summary.rejected,
      icon: XCircle,
      color: "text-red-600 dark:text-red-400",
      bg: "bg-red-100 dark:bg-red-900/30",
      status: "rejected",
    },
    {
      label: t("clientSiteRep.blacklisted", "Blacklisted"),
      value: summary.blacklisted,
      icon: Ban,
      color: "text-gray-600 dark:text-gray-400",
      bg: "bg-gray-100 dark:bg-gray-900/30",
      status: "blacklisted",
    },
  ];

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "approved": return "default";
      case "pending": return "secondary";
      case "rejected": return "destructive";
      case "blacklisted": return "outline";
      default: return "secondary";
    }
  };

  // Filter workers based on active filter
  const filteredWorkers = useMemo(() => {
    if (!activeFilter) return allWorkers;
    return allWorkers.filter(w => w.approval_status === activeFilter);
  }, [allWorkers, activeFilter]);

  const visibleWorkers = filteredWorkers.slice(0, visibleCount);
  const hasMore = filteredWorkers.length > visibleCount;

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg">
            <CardTitle className="flex items-center justify-between text-lg">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                {t("clientSiteRep.workers", "Workers")}
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
        
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className={`${stat.bg} rounded-lg p-3 flex items-center gap-3 cursor-pointer hover:opacity-80 transition-all ${
                  activeFilter === stat.status ? "ring-2 ring-primary ring-offset-2" : ""
                }`}
                onClick={(e) => handleStatusClick(e, stat.status)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleStatusClick(e as unknown as React.MouseEvent, stat.status)}
              >
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Safety Officer Ratio */}
          <div className="border-t pt-3">
            <div className="flex items-center gap-2 text-sm">
              <Shield className="h-4 w-4 text-primary" />
              <span className="font-medium">
                {t("clientSiteRep.safetyCoverage", "Safety Coverage")}:
              </span>
              {safetyOfficerCount > 0 ? (
                <span className={safetyRatio > 25 ? "text-destructive font-medium" : "text-green-600 dark:text-green-400 font-medium"}>
                  1 : {safetyRatio}
                </span>
              ) : (
                <span className="text-destructive font-medium">
                  {t("clientSiteRep.noSafetyOfficerAssigned", "No Safety Officer")}
                </span>
              )}
            </div>
            {safetyOfficerCount > 0 && (
              <p className="text-xs text-muted-foreground mt-1 ps-6">
                ({safetyOfficerCount} {t("clientSiteRep.safetyOfficers", "Safety Officers")} : {summary.total} {t("clientSiteRep.workers", "Workers")})
              </p>
            )}
          </div>
        </CardContent>

        <CollapsibleContent>
          <div className="border-t px-4 pb-4 pt-3 space-y-2">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-muted-foreground">
                {activeFilter 
                  ? t("clientSiteRep.showingFiltered", "Showing {{status}} workers ({{count}})", { 
                      status: activeFilter, 
                      count: filteredWorkers.length 
                    })
                  : t("clientSiteRep.allWorkers", "All Workers ({{count}})", { count: allWorkers.length })
                }
              </p>
              {activeFilter && (
                <Button variant="ghost" size="sm" onClick={clearFilter} className="h-8 px-2">
                  <X className="h-4 w-4 me-1" />
                  {t("common.clearFilter", "Clear Filter")}
                </Button>
              )}
            </div>
            
            {visibleWorkers.length > 0 ? (
              visibleWorkers.map((worker) => (
                <div
                  key={worker.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{worker.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {worker.worker_id ? `ID: ${worker.worker_id}` : worker.company_name}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ms-3">
                    {worker.mobile_number && (
                      <a
                        href={`tel:${worker.mobile_number}`}
                        className="p-2 rounded-full hover:bg-primary/10 text-primary"
                        onClick={(e) => e.stopPropagation()}
                        aria-label={t("common.call", "Call")}
                      >
                        <Phone className="h-4 w-4" />
                      </a>
                    )}
                    <Badge variant={getStatusBadgeVariant(worker.approval_status)}>
                      {worker.approval_status}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                {activeFilter 
                  ? t("clientSiteRep.noWorkersMatchFilter", "No workers match this filter")
                  : t("clientSiteRep.noWorkersFound", "No workers found")
                }
              </p>
            )}

            {hasMore && (
              <Button 
                variant="outline" 
                className="w-full mt-3"
                onClick={() => setVisibleCount(prev => prev + ITEMS_PER_PAGE)}
              >
                {t("common.loadMore", "Load More")} ({filteredWorkers.length - visibleCount} {t("common.remaining", "remaining")})
              </Button>
            )}
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
