import { useState } from "react";
import { ShieldAlert, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import type { ClientSiteRepViolation } from "@/hooks/contractor-management/use-client-site-rep-data";

interface ViolationsCardProps {
  violations: ClientSiteRepViolation[];
}

const severityColors: Record<string, string> = {
  low: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  medium: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  high: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  critical: "bg-red-200 text-red-900 dark:bg-red-800/50 dark:text-red-300",
};

const statusColors: Record<string, string> = {
  open: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  investigating: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  resolved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  dismissed: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

const ITEMS_PER_PAGE = 5;

export function ViolationsCard({ violations }: ViolationsCardProps) {
  const { t } = useTranslation();
  const [expandedViolationId, setExpandedViolationId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  const toggleViolationDetails = (violationId: string) => {
    setExpandedViolationId(prev => prev === violationId ? null : violationId);
  };

  const visibleViolations = violations.slice(0, visibleCount);
  const hasMore = violations.length > visibleCount;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ShieldAlert className="h-5 w-5 text-primary" />
          {t("clientSiteRep.recentViolations", "Recent Violations")}
          <span className="text-muted-foreground font-normal">({violations.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {violations.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">
            {t("clientSiteRep.noViolations", "No violations recorded")}
          </p>
        ) : (
          <div className="space-y-3">
            {visibleViolations.map((violation) => (
              <Collapsible 
                key={violation.id}
                open={expandedViolationId === violation.id}
                onOpenChange={() => toggleViolationDetails(violation.id)}
              >
                <CollapsibleTrigger asChild>
                  <div
                    className="flex items-start justify-between gap-2 p-2 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                    role="button"
                    tabIndex={0}
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{violation.violation_type}</p>
                        {expandedViolationId === violation.id ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{violation.company_name}</p>
                      <div className="flex items-center gap-2">
                        <Badge className={severityColors[violation.severity] || "bg-muted"} variant="secondary">
                          {t(`violations.severity.${violation.severity}`, violation.severity)}
                        </Badge>
                        <Badge className={statusColors[violation.status] || "bg-muted"} variant="secondary">
                          {t(`violations.status.${violation.status}`, violation.status)}
                        </Badge>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(violation.reported_at), "dd/MM/yyyy")}
                    </span>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-2 p-3 rounded-lg border bg-card text-sm space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-muted-foreground text-xs">{t("violations.type", "Type")}</p>
                        <p className="font-medium">{violation.violation_type}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">{t("violations.company", "Company")}</p>
                        <p className="font-medium">{violation.company_name}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">{t("violations.severity", "Severity")}</p>
                        <Badge className={severityColors[violation.severity] || "bg-muted"} variant="secondary">
                          {violation.severity}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">{t("violations.status", "Status")}</p>
                        <Badge className={statusColors[violation.status] || "bg-muted"} variant="secondary">
                          {violation.status}
                        </Badge>
                      </div>
                      <div className="col-span-2">
                        <p className="text-muted-foreground text-xs">{t("violations.reportedAt", "Reported At")}</p>
                        <p className="font-medium">{format(new Date(violation.reported_at), "dd MMM yyyy, HH:mm")}</p>
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}

            {hasMore && (
              <Button 
                variant="outline" 
                className="w-full mt-3"
                onClick={() => setVisibleCount(prev => prev + ITEMS_PER_PAGE)}
              >
                {t("common.loadMore", "Load More")} ({violations.length - visibleCount} {t("common.remaining", "remaining")})
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
