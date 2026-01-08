import { ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

export function ViolationsCard({ violations }: ViolationsCardProps) {
  const { t } = useTranslation();

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
            {violations.map((violation) => (
              <div
                key={violation.id}
                className="flex items-start justify-between gap-2 p-2 rounded-lg bg-muted/50"
              >
                <div className="space-y-1">
                  <p className="font-medium text-sm">{violation.violation_type}</p>
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
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
