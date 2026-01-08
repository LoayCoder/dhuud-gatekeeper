import { AlertTriangle, FileWarning, Search, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import type { ClientSiteRepIncidentSummary } from "@/hooks/contractor-management/use-client-site-rep-data";

interface IncidentsSummaryCardProps {
  summary: ClientSiteRepIncidentSummary;
}

export function IncidentsSummaryCard({ summary }: IncidentsSummaryCardProps) {
  const { t } = useTranslation();

  const stats = [
    {
      label: t("clientSiteRep.open", "Open"),
      value: summary.open,
      icon: FileWarning,
      color: "text-red-600 dark:text-red-400",
    },
    {
      label: t("clientSiteRep.underInvestigation", "Under Investigation"),
      value: summary.under_investigation,
      icon: Search,
      color: "text-yellow-600 dark:text-yellow-400",
    },
    {
      label: t("clientSiteRep.closed", "Closed"),
      value: summary.closed,
      icon: CheckCircle2,
      color: "text-green-600 dark:text-green-400",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <AlertTriangle className="h-5 w-5 text-primary" />
          {t("clientSiteRep.incidents", "Incidents")}
          <span className="text-muted-foreground font-normal">({summary.total})</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-center justify-center p-3 rounded-lg bg-muted/50"
            >
              <stat.icon className={`h-6 w-6 ${stat.color} mb-1`} />
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground text-center">{stat.label}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
